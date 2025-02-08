import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Subscription } from './schemas/subscription.schema';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
  ) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2025-01-27.acacia',
      },
    );
  }

  async createCheckoutSession(email: string, planType: 'basic' | 'premium') {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price:
            planType === 'basic'
              ? 'price_1QqJktImbnhk3Vamex5pRZla' //teste id
              : 'price_1QqJkYImbnhk3VamParAbIol', //teste id
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        email,
        planType,
      },
    });

    return { checkoutUrl: session.url };
  }

  async handleWebhook(rawBody: string, signature: string) {
    try {
      console.log('Iniciando processamento do webhook');

      const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        console.error('Webhook secret não encontrado');
        throw new Error('Stripe webhook secret is not defined');
      }

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      console.log('Evento recebido:', event.type);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('Session:', {
          email: session.metadata?.email,
          planType: session.metadata?.planType,
          subscription: session.subscription,
        });

        await this.createSubscription(
          session.metadata?.email,
          session.metadata?.planType,
          session.subscription as string,
        );

        console.log('Subscription criada com sucesso');
      }

      return { received: true };
    } catch (error) {
      console.error('Erro no processamento do webhook:', error);
      throw error;
    }
  }

  async createSubscription(
    email: string,
    planType: string,
    stripeSubscriptionId: string,
  ) {
    const stripeSubscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    const subscription = new this.subscriptionModel({
      email,
      plan: planType,
      stripeSubscriptionId,
      endsAt: new Date(stripeSubscription.current_period_end * 1000),
    });

    return subscription.save();
  }
}
