import { describe, expect, it } from 'vitest';
import { createDesignHistory } from '../history';

describe('createDesignHistory (Space pushes, Shift + Space steps back)', () => {
  it('starts on the initial design with nothing to go back to', () => {
    const history = createDesignHistory('default');
    expect(history.current).toBe('default');
    expect(history.canGoBack).toBe(false);
    expect(history.back()).toBeUndefined();
    expect(history.current).toBe('default');
  });

  it('steps back through pushed designs in order and stops at the start', () => {
    const history = createDesignHistory('default');
    history.push('a');
    history.push('b');
    expect(history.current).toBe('b');
    expect(history.size).toBe(3);

    expect(history.back()).toBe('a');
    expect(history.back()).toBe('default');
    expect(history.back()).toBeUndefined();
    expect(history.current).toBe('default');
  });

  it('drops the designs ahead of the cursor when a new one is pushed', () => {
    const history = createDesignHistory('default');
    history.push('a');
    history.push('b');
    history.back();
    history.push('c');

    expect(history.size).toBe(3);
    expect(history.current).toBe('c');
    expect(history.back()).toBe('a');
    expect(history.back()).toBe('default');
  });

  it('reset returns to the initial design and clears the history', () => {
    const history = createDesignHistory('default');
    history.push('a');
    history.push('b');
    expect(history.reset()).toBe('default');
    expect(history.size).toBe(1);
    expect(history.canGoBack).toBe(false);
    expect(history.back()).toBeUndefined();
  });

  it('push returns the snapshot it stored', () => {
    const history = createDesignHistory({ n: 0 });
    const snapshot = { n: 1 };
    expect(history.push(snapshot)).toBe(snapshot);
    expect(history.current).toBe(snapshot);
  });
});
