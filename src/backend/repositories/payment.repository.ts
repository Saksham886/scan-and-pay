import { prisma } from "@/backend/lib/db";
import type { PaymentStatus, Prisma } from "@/generated/prisma";

export const paymentRepository = {
  async createPayment(data: {
    orderId: string;
    amountPaise: number;
    merchantTxnId: string;
    phonepeMerchantId?: string;
  }) {
    return prisma.payment.create({ data });
  },

  async findByMerchantTxnId(merchantTxnId: string) {
    return prisma.payment.findUnique({
      where: { merchantTxnId },
      include: {
        order: {
          include: {
            cafe: {
              select: {
                id: true,
                phonepeSaltKey: true,
                phonepeSaltIndex: true,
                phonepeMerchantId: true,
              },
            },
          },
        },
      },
    });
  },

  async updatePaymentStatus(
    merchantTxnId: string,
    data: {
      status: PaymentStatus;
      phonepeTxnId?: string;
      paymentMethod?: string;
      webhookPayload?: Prisma.InputJsonValue;
      paidAt?: Date;
    }
  ) {
    return prisma.payment.update({
      where: { merchantTxnId },
      data,
    });
  },

  /**
   * Conditionally transitions payment status, only if it hasn't already
   * reached a terminal SUCCESS/REFUNDED state. Returns whether this call
   * won the race, so callers can skip side effects (SSE broadcast,
   * notifications) when a concurrent webhook retry already applied it.
   */
  async claimPaymentResult(
    merchantTxnId: string,
    data: {
      status: PaymentStatus;
      phonepeTxnId?: string;
      paymentMethod?: string;
      webhookPayload?: Prisma.InputJsonValue;
      paidAt?: Date;
    }
  ): Promise<boolean> {
    const result = await prisma.payment.updateMany({
      where: {
        merchantTxnId,
        status: { notIn: ["SUCCESS", "REFUNDED"] },
      },
      data,
    });
    return result.count > 0;
  },

  async getPaymentsForOrder(orderId: string) {
    return prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
  },
};
