import { ErrorHandler, Injectable } from '@angular/core';

// custom error handler for chunk loading failures
// handles angular lazy loading errors by reloading page
@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
    handleError(error: any): void {
        // regex to detect chunk loading errors from lazy loaded modules
        const chunkFailedMessage = /Failed to fetch dynamically imported module/i;
        // check if error is chunk loading failure
        if (chunkFailedMessage.test(error.message)) {
            // reload page to fetch updated chunks after deployment
            console.warn('Chunk loading failed. Force reloading page...');
            window.location.reload();
        } else {
            // log other errors normally
            console.error('Unhandled Global Error:', error);
        }
    }
}
