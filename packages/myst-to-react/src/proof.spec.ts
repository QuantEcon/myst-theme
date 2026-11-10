import { describe, it, expect } from 'vitest';
import { getProofName } from './proof.js';

describe('getProofName', () => {
  it('capitalizes the kind when no numbering is set', () => {
    expect(getProofName('property')).toBe('Property');
    expect(getProofName('property', {})).toBe('Property');
  });

  it('uses the name from the kind numbering template', () => {
    expect(getProofName('property', { 'proof:property': { template: 'Fact %s' } })).toBe('Fact');
  });

  it('accepts {number} as the number placeholder', () => {
    expect(getProofName('theorem', { 'proof:theorem': { template: 'Satz {number}' } })).toBe(
      'Satz',
    );
  });

  it('only reads the template for its own kind', () => {
    const numbering = { 'proof:property': { template: 'Fact %s' } };
    expect(getProofName('theorem', numbering)).toBe('Theorem');
  });

  it('ignores templates that use {name} or leave no name', () => {
    expect(getProofName('remark', { 'proof:remark': { template: 'Remark %s ({name})' } })).toBe(
      'Remark',
    );
    expect(getProofName('lemma', { 'proof:lemma': { template: '%s' } })).toBe('Lemma');
  });

  it('returns an empty name without a kind', () => {
    expect(getProofName(undefined, { 'proof:property': { template: 'Fact %s' } })).toBe('');
  });
});
