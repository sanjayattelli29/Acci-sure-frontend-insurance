import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
    handleError(error: any): void {
        const chunkFailedMessage = /Failed to fetch dynamically imported module/i;
        if (chunkFailedMessage.test(error.message)) {
            console.warn('Chunk loading failed. Force reloading page...');
            window.location.reload();
        } else {
            console.error('Unhandled Global Error:', error);
        }
    }
}
