import { combi } from '../../../lib/combi';

export async function POST() {
    try {
        await combi(); 
    } catch (error) {
        console.error(error);
    }
}