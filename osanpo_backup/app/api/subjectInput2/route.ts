import { subjectFix } from '../../../lib/subjectInput2';

export async function POST() {
    try {
        await subjectFix(); 
    } catch (error) {
        console.error(error);
    }
}