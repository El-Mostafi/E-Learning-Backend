import {CustomError} from './custome-error';
export class NotFoundError extends CustomError{
    statusCode = 404
    constructor() {
        super('Not Fund');
    }

    generateErrors() {
        return [{message: 'Not Fund'}]
    } 
}