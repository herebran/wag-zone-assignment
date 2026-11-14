/**
 * The undo history of the open board: each version of the board, in order, and which one is showing. A change made
 * after stepping back drops the steps ahead of it.
 */
import type { Board } from '@/lib/records';

/** How many steps are kept. Beyond that, the oldest is dropped. */
const MAXIMUM_STEPS = 120;

/** Typing in one field with pauses shorter than this counts as one step, so undo removes a word, not a letter. */
const TYPING_PAUSE_MILLISECONDS = 700;

export interface BoardHistory {
    steps: readonly Board[];

    /** Which step is showing. */
    index: number;

    /** The field the latest step was typed in, and when. Null when the step was not typing. */
    typedField: string | null;
    changedAt: number;
}

export function createHistory(board: Board): BoardHistory {
    return { steps: [board], index: 0, typedField: null, changedAt: 0 };
}

export function getCurrentStep(history: BoardHistory): Board {
    return history.steps[history.index];
}

export function canUndo(history: BoardHistory): boolean {
    return history.index > 0;
}

export function canRedo(history: BoardHistory): boolean {
    return history.index < history.steps.length - 1;
}

/**
 * Adds a changed board as the newest step.
 *
 * @param typedField the field being typed in ('note:3:when'), or null when the change is not typing
 * @param changedAt the time of the change, in milliseconds
 */
export function recordStep(
    history: BoardHistory,
    board: Board,
    typedField: string | null,
    changedAt: number
): BoardHistory {
    const isLatestStep = history.index === history.steps.length - 1;
    const isSameField = typedField !== null && typedField === history.typedField;
    const isSoonAfter = changedAt - history.changedAt < TYPING_PAUSE_MILLISECONDS;

    // More typing in the same field replaces the newest step, so one undo removes all of it.
    if (isLatestStep && isSameField && isSoonAfter) {
        const steps = [...history.steps.slice(0, -1), board];

        return { ...history, steps, changedAt };
    }

    const steps = [...history.steps.slice(0, history.index + 1), board].slice(-MAXIMUM_STEPS);

    return { steps, index: steps.length - 1, typedField, changedAt };
}

export function undoStep(history: BoardHistory): BoardHistory {
    if (!canUndo(history)) {
        return history;
    }

    return { ...history, index: history.index - 1, typedField: null };
}

export function redoStep(history: BoardHistory): BoardHistory {
    if (!canRedo(history)) {
        return history;
    }

    return { ...history, index: history.index + 1, typedField: null };
}
