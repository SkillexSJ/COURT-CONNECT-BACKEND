/**
 * Prisma Query Builder
 *
 * A reusable, chainable query builder that converts Express query-string
 * params into a Prisma-compatible `findMany` argument object with:
 *   - search (OR-based text search across multiple fields)
 *   - filtering (exact, range, boolean, enum, and array-contains)
 *   - sorting (single or multi-field, asc/desc)
 *   - pagination (page + limit → skip/take, returns meta)
 *   - field selection (pick / omit specific columns)
 *   - soft-delete awareness (auto-excludes deletedAt != null)
 */

/* ---------- Types ---------- */

export interface QueryParams {
  // search
  searchTerm?: string;

  // pagination
  page?: string | number;
  limit?: string | number;

  // sorting  — "createdAt" or "-createdAt" (desc) or "name,-createdAt"
  sortBy?: string;

  // field selection — "name,email,role"
  fields?: string;

  // include soft-deleted?
  includeDeleted?: string;

  // everything else becomes a filter
  [key: string]: unknown;
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  // Legacy aliases kept for compatibility with older frontend consumers.
  page: number;
  limit: number;
  total: number;
}

interface BuildResult<TWhere, TSelect, TOrderBy> {
  where: TWhere;
  orderBy: TOrderBy;
  skip: number;
  take: number;
  select: TSelect | undefined;
}

//Reserved keys (not treated as filters)
const RESERVED_KEYS = new Set([
  "searchTerm",
  "page",
  "limit",
  "sortBy",
  "fields",
  "includeDeleted",
]);

//Operator suffixes
const OPERATOR_MAP: Record<string, string> = {
  _gte: "gte",
  _gt: "gt",
  _lte: "lte",
  _lt: "lt",
  _not: "not",
  _contains: "contains",
  _startsWith: "startsWith",
  _endsWith: "endsWith",
  _in: "in",
  _notIn: "notIn",
};

//Builder

export class QueryBuilder<
  TWhere = Record<string, unknown>,
  TSelect = Record<string, boolean>,
  TOrderBy = Record<string, string>,
> {
  private whereConditions: Record<string, unknown>[] = [];
  private orderByClause: Record<string, string>[] = [];
  private skipValue = 0;
  private takeValue = 10;
  private selectClause: Record<string, boolean> | undefined;
  private pageValue = 1;

  constructor(
    private readonly params: QueryParams,
    private readonly defaults?: {
      limit?: number;
      maxLimit?: number;
      defaultSort?: string;
    },
  ) {
    this.takeValue = this.defaults?.limit ?? 10;
  }

  /* ---- Search ---- */

  /**
   * Text search across multiple fields using OR.
   *
   * ```ts
   * new QueryBuilder(query)
   *   .search(["name", "email", "locationLabel"])
   *   .build();
   * ```
   *
   * Searching nested fields:
   * ```ts
   * .search(["name", "court.name"])
   * ```
   */
  search(searchableFields: string[]): this {
    const term = this.params.searchTerm;
    if (!term || searchableFields.length === 0) return this;

    const orConditions = searchableFields.map((field) => {
      if (field.includes(".")) {
        // nested relation search, e.g. "court.name"
        const parts = field.split(".");
        let condition: Record<string, unknown> = {
          contains: term,
          mode: "insensitive",
        };
        for (let i = parts.length - 1; i >= 0; i--) {
          condition = {
            [parts[i]!]: i === parts.length - 1 ? condition : condition,
          };
        }
        return condition;
      }
      return {
        [field]: { contains: term, mode: "insensitive" },
      };
    });

    this.whereConditions.push({ OR: orConditions });
    return this;
  }

  /* ---- Filter ---- */

  /**
   * Auto-parses query params into Prisma where clauses.
   *
   * Supports:
   *   - exact match:     `?status=ACTIVE`
   *   - range:           `?basePrice_gte=100&basePrice_lte=500`
   *   - boolean:         `?isIndoor=true`
   *   - in / notIn:      `?type_in=TENNIS,BADMINTON`
   *   - string ops:      `?name_contains=royal`
   *   - enum arrays:     `?status=ACTIVE,MAINTENANCE`
   *
   * Extra allowed fields can be whitelisted:
   * ```ts
   * .filter(["status", "type", "isIndoor", "basePrice"])
   * ```
   * Pass an empty array to allow ALL non-reserved keys.
   */
  filter(allowedFields?: string[]): this {
    const entries = Object.entries(this.params);

    for (const [rawKey, rawValue] of entries) {
      if (
        RESERVED_KEYS.has(rawKey) ||
        rawValue === undefined ||
        rawValue === ""
      )
        continue;

      // Check for operator suffix
      let fieldName = rawKey;
      let operator: string | null = null;

      for (const [suffix, op] of Object.entries(OPERATOR_MAP)) {
        if (rawKey.endsWith(suffix)) {
          fieldName = rawKey.slice(0, -suffix.length);
          operator = op;
          break;
        }
      }

      // Whitelist check
      if (
        allowedFields &&
        allowedFields.length > 0 &&
        !allowedFields.includes(fieldName)
      ) {
        continue;
      }

      const value = this.parseValue(rawValue, operator);

      if (operator) {
        this.whereConditions.push({
          [fieldName]: { [operator]: value },
        });
      } else {
        this.whereConditions.push({ [fieldName]: value });
      }
    }

    return this;
  }

  /* ---- Soft delete ---- */

  /**
   * Automatically adds `deletedAt: null` unless `?includeDeleted=true`
   * is in the query. Call this for models that use soft delete.
   */
  softDelete(): this {
    if (this.params.includeDeleted !== "true") {
      this.whereConditions.push({ deletedAt: null });
    }
    return this;
  }

  /* ---- Custom where ---- */

  /**
   * Add an arbitrary where condition.
   * ```ts
   * .addCondition({ organizerId: userId })
   * ```
   */
  addCondition(condition: Record<string, unknown>): this {
    this.whereConditions.push(condition);
    return this;
  }

  /* ---- Sort ---- */

  /**
   * Parses `?sortBy=name,-createdAt` into Prisma orderBy.
   *
   * Prefix with `-` for descending. Multiple fields separated by commas.
   * Falls back to `defaults.defaultSort` or `-createdAt`.
   */
  sort(): this {
    const raw =
      this.params.sortBy || this.defaults?.defaultSort || "-createdAt";
    const fields = raw
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    this.orderByClause = fields.map((field) => {
      if (field.startsWith("-")) {
        return { [field.slice(1)]: "desc" };
      }
      return { [field]: "asc" };
    });

    return this;
  }

  /* ---- Paginate ---- */

  /**
   * Parses `?page=1&limit=10` into Prisma skip/take.
   */
  paginate(): this {
    const maxLimit = this.defaults?.maxLimit ?? 100;

    this.pageValue = Math.max(1, Number(this.params.page) || 1);
    this.takeValue = Math.min(
      maxLimit,
      Math.max(1, Number(this.params.limit) || this.defaults?.limit || 10),
    );
    this.skipValue = (this.pageValue - 1) * this.takeValue;

    return this;
  }

  /* ---- Select ---- */

  /**
   * Parses `?fields=name,email,role` into Prisma select.
   */
  selectFields(): this {
    if (!this.params.fields) return this;

    const fields = this.params.fields
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    if (fields.length > 0) {
      this.selectClause = {};
      for (const field of fields) {
        this.selectClause[field] = true;
      }
    }

    return this;
  }

  /* ---- Build ---- */

  /**
   * Returns the Prisma-compatible query args.
   */
  build(): BuildResult<TWhere, TSelect, TOrderBy> {
    const where =
      this.whereConditions.length > 0
        ? ({ AND: this.whereConditions } as unknown as TWhere)
        : ({} as TWhere);

    return {
      where,
      orderBy: (this.orderByClause.length > 0
        ? this.orderByClause
        : [{ createdAt: "desc" }]) as unknown as TOrderBy,
      skip: this.skipValue,
      take: this.takeValue,
      select: this.selectClause as TSelect | undefined,
    };
  }

  /**
   * Convenience: builds and returns a meta calculator.
   *
   * Usage:
   * ```ts
   * const qb = new QueryBuilder(req.query).search(["name"]).filter().sort().paginate();
   * const { where, orderBy, skip, take } = qb.build();
   * const [data, total] = await prisma.$transaction([
   *   prisma.court.findMany({ where, orderBy, skip, take }),
   *   prisma.court.count({ where }),
   * ]);
   * const meta = qb.countMeta(total);
   * ```
   */
  countMeta(total: number): PaginationMeta {
    const totalPages = Math.ceil(total / this.takeValue);
    return {
      totalItems: total,
      totalPages,
      currentPage: this.pageValue,
      itemsPerPage: this.takeValue,
      hasNextPage: this.pageValue < totalPages,
      hasPrevPage: this.pageValue > 1,
      // aliases
      page: this.pageValue,
      limit: this.takeValue,
      total,
    };
  }

  /* ---- Internals ---- */

  private parseValue(raw: unknown, operator: string | null): unknown {
    const str = String(raw);

    // "in" and "notIn" always convert to arrays
    if (operator === "in" || operator === "notIn") {
      return str.split(",").map((v) => this.coerce(v.trim()));
    }

    // Comma-separated values without operator → treat as "in"
    if (!operator && str.includes(",")) {
      return { in: str.split(",").map((v) => this.coerce(v.trim())) };
    }

    return this.coerce(str);
  }

  private coerce(value: string): string | number | boolean {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null as unknown as string;

    // Try number
    const num = Number(value);
    if (!Number.isNaN(num) && value !== "") return num;

    return value;
  }
}
