import {CustomError} from './custome-error';
import { ValidationError} from 'express-validator';

export class RequestValidationError extends CustomError{
    statusCode = 400

    constructor(public errors: ValidationError[]) {
        super('Invalid request');
    }

    generateErrors() {
        return this.errors
            .filter((error): error is ValidationError & { path: string } => 'path' in error)
            .map((error) => {
                return { message: error.msg, field: error.path };
            });
    }
}