import { SelectQueryBuilder } from 'typeorm';
import { applyListSort, partnerSortColumns, toSortOrder } from '../list-sort';

type Call = [string, string, string?];

function mockQb() {
  const calls: Call[] = [];
  const qb: Record<'orderBy' | 'addOrderBy', jest.Mock> = {
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
  };
  qb.orderBy.mockImplementation((c: string, o: string, n?: string) => {
    calls.length = 0;
    calls.push([c, o, n]);
    return qb;
  });
  qb.addOrderBy.mockImplementation((c: string, o: string, n?: string) => {
    calls.push([c, o, n]);
    return qb;
  });
  return {
    qb: qb as unknown as SelectQueryBuilder<Record<string, unknown>>,
    calls,
  };
}

const columns = {
  number: 'doc.documentNumber',
  partnerName: ['customer.name', 'supplier.name'],
};
const fallback = { column: 'doc.dateCreated', order: 'DESC' as const };

describe('applyListSort', () => {
  it('uses the default ordering without a sort field', () => {
    const { qb, calls } = mockQb();
    applyListSort(qb, undefined, columns, fallback);
    expect(calls).toEqual([['doc.dateCreated', 'DESC', undefined]]);
  });

  it('ignores a field that is not whitelisted', () => {
    const { qb, calls } = mockQb();
    applyListSort(
      qb,
      { field: 'hack' as 'number', order: 'ASC' },
      columns,
      fallback,
    );
    expect(calls).toEqual([['doc.dateCreated', 'DESC', undefined]]);
  });

  it('sorts on the mapped column(s) with the default as tie-breaker', () => {
    const { qb, calls } = mockQb();
    applyListSort(
      qb,
      { field: 'partnerName', order: 'DESC' },
      columns,
      fallback,
    );
    expect(calls).toEqual([
      ['customer.name', 'DESC', 'NULLS LAST'],
      ['supplier.name', 'DESC', 'NULLS LAST'],
      ['doc.dateCreated', 'DESC', undefined],
    ]);
  });

  it('defaults to ASC when only the field is given', () => {
    const { qb, calls } = mockQb();
    applyListSort(qb, { field: 'number' }, columns, fallback);
    expect(calls[0]).toEqual(['doc.documentNumber', 'ASC', 'NULLS LAST']);
  });
});

describe('partnerSortColumns / toSortOrder', () => {
  it('picks the partner column from the direction', () => {
    expect(partnerSortColumns('ACHAT')).toEqual(['supplier.name']);
    expect(partnerSortColumns('VENTE')).toEqual(['customer.name']);
    expect(partnerSortColumns(undefined)).toEqual([
      'customer.name',
      'supplier.name',
    ]);
  });

  it('normalises sortOrder input', () => {
    expect(toSortOrder({ value: 'desc' })).toBe('DESC');
    expect(toSortOrder({ value: '' })).toBeUndefined();
  });
});
