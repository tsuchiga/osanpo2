import { subsubCategoryGet } from '../../../lib/subsubCategoryGet';

export async function POST() {
    try {
        await subsubCategoryGet(); 
    } catch (error) {
        console.error(error);
    }
}