import type Stripe from "stripe";
import AppError from "../../helpers/AppError";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { envVars } from "../../config/env";

const PaymentService = {
  async initiatePayment(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      throw new AppError(404, "Booking not found");
    }

    if (booking.userId !== userId) {
      throw new AppError(403, "You can only pay for your own booking");
    }

    if (booking.status !== "PENDING") {
      throw new AppError(
        400,
        `Cannot initiate payment for a booking with status: ${booking.status}`,
      );
    }

    // Check if booking has expired
    if (booking.expiresAt && new Date() > booking.expiresAt) {
      throw new AppError(
        410,
        "This booking has expired. Please create a new booking.",
      );
    }

    const amount = Math.round(Number(booking.totalAmount) * 100);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, "Invalid booking amount");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: envVars.STRIPE_CURRENCY,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: booking.user.email,
      metadata: {
        bookingId: booking.id,
        userId: booking.userId,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentId: paymentIntent.id },
    });

    return {
      bookingId: booking.id,
      amount,
      currency: envVars.STRIPE_CURRENCY,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      publishableKey: envVars.STRIPE_PUBLISHABLE_KEY,
    };
  },

  async handleWebhook(signature: string, payload: Buffer) {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        envVars.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      throw new AppError(400, "Invalid Stripe webhook signature");
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata?.bookingId;

      if (bookingId) {
        await prisma.booking.updateMany({
          where: {
            id: bookingId,
            status: "PENDING",
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
            paymentId: paymentIntent.id,
          },
        });
      }
    }

    return {
      received: true,
      eventType: event.type,
    };
  },
};

export default PaymentService;
