import crypto from 'crypto';
import { API_CALL } from 'auth-fingerprint';

const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1';

interface CreateInvoiceParams {
    amount: number;
    currency?: string;
    orderId: string;
    toCurrency?: string;
    network?: string;
    merchantId?: string;
    apiKey?: string;
}

interface CreateInvoiceResponse {
    url: string;
    invoiceId: string;
    address?: string;
    network?: string;
}

function generateSign(body: object, apiKey: string): string {
    const json = JSON.stringify(body);
    const base64 = Buffer.from(json).toString('base64');
    return crypto.createHash('md5').update(base64 + apiKey).digest('hex');
}

export async function createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResponse> {
    const { amount, currency = 'USD', orderId, toCurrency, network, merchantId, apiKey } = params;

    if (!merchantId || !apiKey) {
        const err: any = new Error('Cryptomus payment gateway not configured or invalid credentials. Contact support.');
        err.response = { status: 401 };
        throw err;
    }

    const payload: Record<string, any> = {
        amount: amount.toFixed(2),
        currency,
        order_id: orderId,
    };

    // Pass to_currency + network to get wallet address immediately
    if (toCurrency) payload.to_currency = toCurrency;
    if (network) payload.network = network;

    const sign = generateSign(payload, apiKey);

    const res = await API_CALL({
        method: 'POST',
        url: '/payment',
        baseURL: CRYPTOMUS_API_URL,
        body: payload,
        headers: {
            'merchant': merchantId,
            'sign': sign,
        },
    });

    console.log(res.response)
    if (res.status >= 400) {
        const msg: string = res.response?.message || 'Cryptomus payment error';
        const err: any = new Error(msg);
        err.response = { status: msg.toLowerCase().includes('merchant') || msg.toLowerCase().includes('sign') ? 401 : 502 };
        throw err;
    }

    const data = res.response;
 
    if (!data?.result?.url || !data?.result?.uuid) {
        const msg: string = data?.message || 'Cryptomus: unexpected response';
        const err: any = new Error(msg);
        err.response = { status: msg.toLowerCase().includes('merchant') || msg.toLowerCase().includes('sign') ? 401 : 502 };
        throw err;
    }

    return {
        url: data.result.url,
        invoiceId: data.result.uuid,
        address: data.result.address || undefined,
        network: data.result.network || undefined,
    };
}

export interface PaymentInfo {
    uuid: string;
    orderId: string;
    status: string;
    amount: string;
    paymentAmount: string | null;
    payerAmount: string | null;
    payerCurrency: string | null;
    currency: string;
    network: string | null;
    address: string | null;
    txid: string | null;
    isFinal: boolean;
    url: string;
    expiredAt: number | null;
}

/** Check payment status — accepts uuid or order_id. Returns full payment info. */
export async function checkPaymentStatus(
    id: string,
    merchantId: string,
    apiKey: string,
    lookupBy: 'uuid' | 'order_id' = 'uuid',
): Promise<PaymentInfo> {
    const payload = lookupBy === 'order_id' ? { order_id: id } : { uuid: id };
    const sign = generateSign(payload, apiKey);

    const res = await API_CALL({
        method: 'POST',
        url: '/payment/info',
        baseURL: CRYPTOMUS_API_URL,
        body: payload,
        headers: {
            'merchant': merchantId,
            'sign': sign,
        },
    });

    const data = res.response;
    if (!data?.result) {
        throw new Error(data?.message || 'Cryptomus: failed to check payment status');
    }

    const r = data.result;
    return {
        uuid: r.uuid,
        orderId: r.order_id,
        status: r.status,
        amount: r.amount,
        paymentAmount: r.payment_amount ?? null,
        payerAmount: r.payer_amount ?? null,
        payerCurrency: r.payer_currency ?? null,
        currency: r.currency,
        network: r.network ?? null,
        address: r.address ?? null,
        txid: r.txid ?? null,
        isFinal: r.is_final ?? false,
        url: r.url,
        expiredAt: r.expired_at ?? null,
    };
}

/** Payment is considered successful */
export function isPaid(status: string): boolean {
    return status === 'paid' || status === 'paid_over';
}

/** Payment is considered failed/cancelled */
export function isFailed(status: string): boolean {
    return status === 'cancel' || status === 'fail' || status === 'expired';
}
