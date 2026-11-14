/**
 * The board as plain text, to paste where the whole sheet does not fit: the pharmacy workflow board's text fields, a
 * chat, an email. It is a simple list that reads right in any font. It always uses full names, and leaves out the zones
 * and sections that are turned off.
 */
import { format } from 'date-fns';
import { hasNoteContent, IC3_LABELS, IC3_QUEUES, PHLOMOMETER_QUEUES } from '@/lib/board';
import { formatBoardDate } from '@/lib/dates';
import { findTechnician, formatExportName } from '@/lib/names';
import type { Board, Note, Settings, Technician } from '@/lib/records';
import { formatTimeRange } from '@/lib/times';
import { listVisibleZones } from '@/lib/zones';

const TITLE = 'PRIORITY ZONE ASSIGNMENT';

/** Shown where a number or a name is not filled in. */
const NOTHING = '-';

/** The width of the divider lines, in characters. */
const RULE_WIDTH = 40;

export interface BoardTextSource {
    board: Board;
    boardDate: string;
    technicians: readonly Technician[];
    settings: Settings;

    /** When the export was made. The last line says so. */
    now: Date;
}

/**
 * The board as a list: one time slot after another, with a line for each station that has someone. It does not rely on
 * columns lining up, so it survives any font and a narrow field.
 */
export function formatBoardText(source: BoardTextSource): string {
    const { board, boardDate, settings } = source;
    const zones = listVisibleZones(settings.hiddenZones);
    const labelWidth = Math.max(...zones.map((zone) => zone.listLabel.length));
    const lines = [TITLE, `Date: ${formatBoardDate(boardDate)}`, '='.repeat(RULE_WIDTH), ''];

    let hasAssignments = false;
    for (const slot of board.timeSlots) {
        const isFilled = zones.some((zone) => slot.assignments[zone.key].length > 0);
        if (!slot.startTime && !slot.endTime && !isFilled) {
            continue;
        }

        hasAssignments = true;
        const times = formatTimeRange(slot.startTime, slot.endTime, settings.clockFormat);
        lines.push(`[ ${times || '(no time set)'} ]`);
        for (const zone of zones) {
            const technicianIds = slot.assignments[zone.key];
            if (technicianIds.length > 0) {
                lines.push(`  ${padText(`${zone.listLabel}:`, labelWidth + 2)}${formatNames(source, technicianIds)}`);
            }
        }
        lines.push('');
    }
    if (!hasAssignments) {
        lines.push('(no assignments yet)', '');
    }

    lines.push('-'.repeat(RULE_WIDTH));

    if (settings.hasPhlomometer) {
        lines.push('PHLOMOMETER (Under / Above)');
        for (const queue of PHLOMOMETER_QUEUES) {
            const threshold = board.phlomometer[queue];
            const under = threshold.under || NOTHING;
            const above = threshold.above || NOTHING;
            lines.push(`  ${padText(`${queue}:`, 7)}under ${under} / above ${above}`);
        }
        lines.push('');
    }

    if (settings.hasIc3Calls) {
        lines.push('CALL FOR IC3');
        for (const queue of IC3_QUEUES) {
            const call = board.ic3Calls[queue];
            const amount = padText(call.amount || NOTHING, 5);
            const who = formatNames(source, call.technicianIds) || NOTHING;
            lines.push(`  ${padText(IC3_LABELS[queue], 7)}amount ${amount}  who: ${who}`);
        }
        lines.push('');
    }

    if (settings.hasNotes) {
        const notes = board.notes.filter(hasNoteContent);
        lines.push('OTHER NOTES AND PRIORITIES');
        for (const note of notes) {
            lines.push(formatNoteLine(source, note));
        }
        if (notes.length === 0) {
            lines.push('  (none)');
        }
        lines.push('');
    }

    lines.push('='.repeat(RULE_WIDTH), formatGeneratedLine(source.now));

    return lines.join('\n');
}

/**
 * The full names of the given technicians, in the order they were assigned. '' when there are none.
 */
function formatNames(source: BoardTextSource, technicianIds: readonly number[]): string {
    return technicianIds.map((id) => formatExportName(findTechnician(source.technicians, id))).join(', ');
}

function padText(text: string, width: number): string {
    return text.padEnd(width, ' ');
}

/**
 * A note on one line of the list: "  - TPR  (when: by noon; who: Jane Doe)".
 */
function formatNoteLine(source: BoardTextSource, note: Note): string {
    const details: string[] = [];
    if (note.when.trim()) {
        details.push(`when: ${note.when.trim()}`);
    }
    if (note.technicianIds.length > 0) {
        details.push(`who: ${formatNames(source, note.technicianIds)}`);
    }

    const what = note.what || '(unnamed)';
    return details.length > 0 ? `  - ${what}  (${details.join('; ')})` : `  - ${what}`;
}

/**
 * The export's last line, with the time it was made: "Generated 11/12/2026, 2:05:09 PM". The format is fixed here
 * because a browser's own date format can use special spaces that some fields reject.
 */
function formatGeneratedLine(now: Date): string {
    return `Generated ${format(now, 'M/d/yyyy, h:mm:ss a')}`;
}
