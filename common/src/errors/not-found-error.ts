import {CustomError} from './custome-error';
export class NotFundError extends CustomError{
    statusCode = 404
    constructor() {
        super('Not Fund');
    }

    generateErrors() {
        return [{message: 'Not Fund'}]
    } 
}