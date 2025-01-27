import {CustomError} from './custome-error';
export class NotAutherizedError extends CustomError{
    statusCode = 401
    constructor() {
        super('Not Authorized');
    }

    generateErrors() {
        return [{message: 'Not Authorized'}]
    } 
}