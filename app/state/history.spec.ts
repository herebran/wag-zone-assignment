import { describe, expect, it } from 'vitest';
import { addTimeSlot, createBlankBoard, setIc3Amount } from '@/lib/board';
import { canRedo, canUndo, createHistory, getCurrentStep, recordStep, redoStep, undoStep } from '@/state/history';

describe('history', () => {
    it('starts with the board as its only step: nothing to undo, nothing to redo', () => {
        const board = createBlankBoard();
        const history = createHistory(board);

        expect(getCurrentStep(history)).toBe(board);
        expect(canUndo(history)).toBe(false);
        expect(canRedo(history)).toBe(false);
        expect(undoStep(history)).toBe(history);
        expect(redoStep(history)).toBe(history);
    });

    it('steps back through the changes and forward again', () => {
        const first = createBlankBoard();
        const second = addTimeSlot(first);
        const third = addTimeSlot(second);
        let history = createHistory(first);
        history = recordStep(history, second, null, 1000);
        history = recordStep(history, third, null, 2000);

        history = undoStep(history);
        expect(getCurrentStep(history)).toBe(second);
        expect(canRedo(history)).toBe(true);

        history = undoStep(history);
        expect(getCurrentStep(history)).toBe(first);
        expect(canUndo(history)).toBe(false);

        history = redoStep(redoStep(history));
        expect(getCurrentStep(history)).toBe(third);
        expect(canRedo(history)).toBe(false);
    });

    it('drops the steps ahead when a change is made after stepping back', () => {
        const first = createBlankBoard();
        const second = addTimeSlot(first);
        const other = setIc3Amount(first, 'F1', '20');
        let history = recordStep(createHistory(first), second, null, 1000);
        history = recordStep(undoStep(history), other, null, 2000);

        expect(history.steps).toEqual([first, other]);
        expect(canRedo(history)).toBe(false);
    });

    it('makes one step of typing in a field, and a new step after a pause or in another field', () => {
        const blank = createBlankBoard();
        let history = createHistory(blank);
        history = recordStep(history, setIc3Amount(blank, 'F1', '2'), 'ic3Call:F1', 1000);
        history = recordStep(history, setIc3Amount(blank, 'F1', '20'), 'ic3Call:F1', 1400);
        history = recordStep(history, setIc3Amount(blank, 'F1', '200'), 'ic3Call:F1', 2000);
        expect(history.steps).toHaveLength(2);
        expect(getCurrentStep(history).ic3Calls.F1.amount).toBe('200');

        history = recordStep(history, setIc3Amount(blank, 'F1', '2000'), 'ic3Call:F1', 2700);
        history = recordStep(history, setIc3Amount(blank, 'FILL', '5'), 'ic3Call:FILL', 2800);
        expect(history.steps).toHaveLength(4);

        expect(getCurrentStep(undoStep(undoStep(undoStep(history))))).toBe(blank);
    });

    it('starts a new step for typing that follows an undo, even in the same field', () => {
        const blank = createBlankBoard();
        let history = createHistory(blank);
        history = recordStep(history, setIc3Amount(blank, 'F1', '2'), 'ic3Call:F1', 1000);
        history = recordStep(history, addTimeSlot(blank), null, 1100);
        history = undoStep(history);
        history = recordStep(history, setIc3Amount(blank, 'F1', '25'), 'ic3Call:F1', 1200);

        expect(history.steps.map((step) => step.ic3Calls.F1.amount)).toEqual(['', '2', '25']);
    });

    it('forgets the oldest steps past a hundred and twenty', () => {
        let board = createBlankBoard();
        let history = createHistory(board);
        for (let count = 1; count <= 150; count++) {
            board = setIc3Amount(board, 'F1', String(count));
            history = recordStep(history, board, null, count * 1000);
        }

        expect(history.steps).toHaveLength(120);
        expect(history.steps[0].ic3Calls.F1.amount).toBe('31');
        expect(getCurrentStep(history).ic3Calls.F1.amount).toBe('150');
    });
});
