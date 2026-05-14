import { Activity } from '@/models/Activity';

export async function logActivity({
    userId,
    action,
    type,
    description,
    ip,
    location = 'Unknown',
    status = 'success'
}: {
    userId: string | any;
    action: string;
    type: string;
    description: string;
    ip: string;
    location?: string;
    status?: 'success' | 'failed' | 'warning';
}): Promise<void> {
    try {
        await Activity.create({
            userId,
            action,
            type,
            description,
            ip,
            location,
            status
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
