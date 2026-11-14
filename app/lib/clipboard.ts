/**
 * Copies a text to the clipboard, for the user to paste elsewhere. Browsers only allow that over https or on localhost.
 * Elsewhere, the text is selected in its field and copied the way Ctrl+C would.
 *
 * @param field the field showing the text
 * @returns whether the text was copied
 */
export async function copyText(text: string, field: HTMLTextAreaElement | null): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        if (!field) {
            return false;
        }

        field.focus();
        field.select();
        return document.execCommand('copy');
    }
}
