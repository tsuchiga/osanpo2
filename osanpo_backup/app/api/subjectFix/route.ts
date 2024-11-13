import { subjectFix } from '../../../lib/subjectFix';

export async function POST() {
    try {
        await subjectFix(); 
    } catch (error) {
        console.error(error);
    }
}