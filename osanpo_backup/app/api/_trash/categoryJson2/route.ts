import { categoryJson2 } from '../../../lib/categoryJson2';

export async function POST() {
    try {
        await categoryJson2(); 
    } catch (error) {
        console.error(error);
    }
}