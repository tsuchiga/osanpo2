import { categoryJson } from '../../../lib/categoryJson';

export async function POST() {
    try {
        await categoryJson(); 
    } catch (error) {
        console.error(error);
    }
}