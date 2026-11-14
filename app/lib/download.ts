/**
 * Downloads a file the app made: the board as text or as a PDF, or a backup.
 */

/**
 * Downloads a file through a temporary link.
 */
export function downloadFile(fileName: string, file: Blob): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
}

/**
 * Downloads a text as a file.
 *
 * @param mediaType the kind of file, like 'text/plain' or 'application/json'
 */
export function downloadText(fileName: string, text: string, mediaType: string): void {
    downloadFile(fileName, new Blob([text], { type: mediaType }));
}
