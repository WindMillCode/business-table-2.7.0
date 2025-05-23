import { toDataFrame } from '@grafana/data';
import { Select } from '@grafana/ui';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createSelector, getJestSelectors } from '@volkovlabs/jest-selectors';
import React from 'react';

import { DEFAULT_COLUMN_APPEARANCE, TEST_IDS } from '@/constants';
import { ColumnPinDirection } from '@/types';
import {
  createColumnAppearanceConfig,
  createColumnConfig,
  createColumnEditConfig,
  createColumnFilterConfig,
  createColumnSortConfig,
  createFileCellConfig,
  createGaugeConfig,
} from '@/utils';

import { ColumnsEditor } from './ColumnsEditor';
import { ColumnEditor } from './components';

/**
 * Props
 */
type Props = React.ComponentProps<typeof ColumnsEditor>;

const InTestIds = {
  columnEditor: createSelector('data-testid column-editor'),
};

/**
 * Mock Column Editor
 */
const ColumnEditorMock = ({ value, onChange }: any) => (
  <input
    {...InTestIds.columnEditor.apply()}
    onChange={() => {
      onChange(value);
    }}
  />
);

/**
 * Mock Column Editor
 */
jest.mock('./components/ColumnEditor', () => ({
  ColumnEditor: jest.fn(),
}));

describe('ColumnsEditor', () => {
  /**
   * Selectors
   */
  const getSelectors = getJestSelectors({ ...TEST_IDS.columnsEditor, ...InTestIds });
  const selectors = getSelectors(screen);

  /**
   * Get Tested Component
   * @param props
   */
  const getComponent = (props: Partial<Props>) => <ColumnsEditor name="Default" data={[]} {...(props as any)} />;

  /**
   * Data Frame A
   */
  const dataFrameA = toDataFrame({
    fields: [
      {
        name: 'field1',
      },
      {
        name: 'field2',
      },
    ],
    refId: 'A',
  });

  /**
   * Data Frame B
   */
  const dataFrameB = toDataFrame({
    fields: [
      {
        name: 'fieldB1',
      },
      {
        name: 'fieldB2',
      },
    ],
    refId: 'B',
  });

  beforeEach(() => {
    jest.mocked(Select).mockClear();
    jest.mocked(ColumnEditor).mockImplementation(ColumnEditorMock);
  });

  it('Should render items', () => {
    render(
      getComponent({
        data: [dataFrameA],
        value: [
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
          createColumnConfig({
            field: { name: 'field2', source: 'A' },
          }),
        ],
      })
    );

    expect(selectors.itemHeader(false, 'A:field1')).toBeInTheDocument();
    expect(selectors.itemHeader(false, 'A:field2')).toBeInTheDocument();
  });

  it('Should allow select any fields', () => {
    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        value: [],
      })
    );

    expect(Select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({
            value: 'A:field1',
            source: 'A',
            fieldName: 'field1',
            label: 'A:field1',
          }),
          expect.objectContaining({
            value: 'A:field2',
            source: 'A',
            fieldName: 'field2',
            label: 'A:field2',
          }),
          expect.objectContaining({
            value: 'B:fieldB1',
            source: 'B',
            fieldName: 'fieldB1',
            label: 'B:fieldB1',
          }),
          expect.objectContaining({
            value: 'B:fieldB2',
            source: 'B',
            fieldName: 'fieldB2',
            label: 'B:fieldB2',
          }),
        ],
      }),
      expect.anything()
    );
  });

  it('Should allow select any fields from frames without id', () => {
    render(
      getComponent({
        data: [
          {
            fields: dataFrameA.fields,
            length: dataFrameA.length,
          },
          {
            fields: dataFrameB.fields,
            length: dataFrameB.length,
          },
        ],
        value: [],
      })
    );

    expect(Select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({
            value: '0:field1',
            source: 0,
            fieldName: 'field1',
            label: '0:field1',
          }),
          expect.objectContaining({
            value: '0:field2',
            source: 0,
            fieldName: 'field2',
            label: '0:field2',
          }),
          expect.objectContaining({
            value: '1:fieldB1',
            source: 1,
            fieldName: 'fieldB1',
            label: '1:fieldB1',
          }),
          expect.objectContaining({
            value: '1:fieldB2',
            source: 1,
            fieldName: 'fieldB2',
            label: '1:fieldB2',
          }),
        ],
      }),
      expect.anything()
    );
  });

  it('Should allow select fields only from the current data frame', () => {
    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        value: [
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
        ],
      })
    );

    expect(Select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [expect.objectContaining({ fieldName: 'field2', label: 'A:field2', source: 'A', value: 'A:field2' })],
      }),
      expect.anything()
    );
  });

  it('Should allow select fields only from the current data frame without id', () => {
    render(
      getComponent({
        data: [
          {
            fields: dataFrameA.fields,
            length: dataFrameA.length,
          },
          {
            fields: dataFrameB.fields,
            length: dataFrameB.length,
          },
        ],
        value: [
          createColumnConfig({
            field: { name: 'field1', source: 0 },
          }),
        ],
      })
    );

    expect(Select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [expect.objectContaining({ fieldName: 'field2', label: '0:field2', source: 0, value: '0:field2' })],
      }),
      expect.anything()
    );
  });

  it('Should add new item', async () => {
    const onChange = jest.fn();

    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        name: 'Group 1',
        value: [
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
            group: true,
          }),
        ],
        onChange,
      })
    );

    await act(() => fireEvent.change(selectors.newItemName(), { target: { value: 'A:field2' } }));

    expect(selectors.buttonAddNew()).toBeInTheDocument();
    expect(selectors.buttonAddNew()).not.toBeDisabled();

    await act(() => fireEvent.click(selectors.buttonAddNew()));

    expect(onChange).toHaveBeenCalledWith([
      createColumnConfig({
        field: { name: 'field1', source: 'A' },
        group: true,

        /**
         * Add check gauge config
         */
        gauge: createGaugeConfig({}),
        fileCell: createFileCellConfig({}),
      }),
      createColumnConfig({
        field: { name: 'field2', source: 'A' },
        appearance: createColumnAppearanceConfig(DEFAULT_COLUMN_APPEARANCE),
        fileCell: createFileCellConfig({ text: 'Download' }),
      }),
    ]);
  });

  it('Should remove item', async () => {
    const onChange = jest.fn();

    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        name: 'Group 1',
        value: [
          createColumnConfig({
            field: { name: 'field2', source: 'A' },
          }),
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
        ],
        onChange,
      })
    );

    const field2 = selectors.itemHeader(false, 'A:field2');

    /**
     * Check field presence
     */
    expect(field2).toBeInTheDocument();

    /**
     * Remove
     */
    await act(() => fireEvent.click(getSelectors(within(field2)).buttonRemove()));

    expect(onChange).toHaveBeenCalledWith([createColumnConfig({ field: { name: 'field1', source: 'A' } })]);
  });

  it('Should hide item', async () => {
    const onChange = jest.fn();

    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        name: 'Group 1',
        value: [
          createColumnConfig({
            field: { name: 'field2', source: 'A' },
            enabled: true,
          }),
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
        ],
        onChange,
      })
    );

    const field2 = selectors.itemHeader(false, 'A:field2');

    /**
     * Check field presence
     */
    expect(field2).toBeInTheDocument();

    /**
     * Hide
     */
    await act(() => fireEvent.click(getSelectors(within(field2)).buttonToggleVisibility()));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        field: { name: 'field2', source: 'A' },
        enabled: false,
      }),
      expect.anything(),
    ]);
  });

  it('Should show item', async () => {
    const onChange = jest.fn();

    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        name: 'Group 1',
        value: [
          createColumnConfig({
            field: { name: 'field2', source: 'A' },
            enabled: false,
          }),
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
        ],
        onChange,
      })
    );

    const field2 = selectors.itemHeader(false, 'A:field2');

    /**
     * Check field presence
     */
    expect(field2).toBeInTheDocument();

    /**
     * Show
     */
    await act(() => fireEvent.click(getSelectors(within(field2)).buttonToggleVisibility()));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        field: { name: 'field2', source: 'A' },
        enabled: true,
      }),
      expect.anything(),
    ]);
  });

  it('Should render without errors if dataFrame was removed', () => {
    render(
      getComponent({
        data: [dataFrameB],
        name: 'Group 1',
        value: [
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
        ],
      })
    );

    expect(selectors.root()).toBeInTheDocument();
  });

  it('Should reorder items', async () => {
    let onDragEndHandler: (result: DropResult) => void = () => {};
    jest.mocked(DragDropContext).mockImplementation(({ children, onDragEnd }: any) => {
      onDragEndHandler = onDragEnd;
      return children;
    });
    const onChange = jest.fn();

    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        name: 'Group 1',
        value: [
          createColumnConfig({
            field: { name: 'field2', source: 'A' },
          }),
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
        ],
        onChange,
      })
    );

    /**
     * Simulate drop field 1 to index 0
     */
    act(() =>
      onDragEndHandler({
        destination: {
          index: 0,
        },
        source: {
          index: 1,
        },
      } as any)
    );

    expect(onChange).toHaveBeenCalledWith([
      createColumnConfig({ field: { name: 'field1', source: 'A' } }),
      createColumnConfig({ field: { name: 'field2', source: 'A' } }),
    ]);
  });

  it('Should not reorder items if drop outside the list', async () => {
    let onDragEndHandler: (result: DropResult) => void = () => {};
    jest.mocked(DragDropContext).mockImplementation(({ children, onDragEnd }: any) => {
      onDragEndHandler = onDragEnd;
      return children;
    });
    const onChange = jest.fn();

    render(
      getComponent({
        data: [dataFrameA, dataFrameB],
        name: 'Group 1',
        value: [
          createColumnConfig({
            field: { name: 'field2', source: 'A' },
          }),
          createColumnConfig({
            field: { name: 'field1', source: 'A' },
          }),
        ],
        onChange,
      })
    );

    /**
     * Simulate drop field 1 to outside the list
     */
    act(() =>
      onDragEndHandler({
        destination: null,
        source: {
          index: 1,
        },
      } as any)
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('Should expand item content', () => {
    render(
      getComponent({
        value: [createColumnConfig({ field: { name: 'field1', source: 'a' } })],
      })
    );

    expect(selectors.itemHeader(false, 'a:field1')).toBeInTheDocument();
    expect(selectors.itemContent(true, 'a:field1')).not.toBeInTheDocument();

    /**
     * Expand
     */
    fireEvent.click(selectors.itemHeader(false, 'a:field1'));

    expect(selectors.itemContent(false, 'a:field1')).toBeInTheDocument();
  });

  it('Should allow to change item', () => {
    const onChange = jest.fn();

    render(
      getComponent({
        value: [
          createColumnConfig({ field: { name: 'field1', source: 'a' } }),
          createColumnConfig({ field: { name: 'field2', source: 'a' } }),
        ],
        onChange,
      })
    );

    /**
     * Expand
     */
    fireEvent.click(selectors.itemHeader(false, 'a:field1'));

    expect(selectors.columnEditor()).toBeInTheDocument();

    /**
     * Simulate change
     */
    fireEvent.change(selectors.columnEditor(), { target: { value: 'abc' } });

    expect(onChange).toHaveBeenCalledWith([
      createColumnConfig({ field: { name: 'field1', source: 'a' } }),
      createColumnConfig({ field: { name: 'field2', source: 'a' } }),
    ]);
  });

  describe('Tags', () => {
    it('Should show group', () => {
      render(
        getComponent({
          data: [dataFrameA, dataFrameB],
          name: 'Group 1',
          value: [
            createColumnConfig({
              field: { name: 'field1', source: 'A' },
              group: true,
            }),
          ],
        })
      );

      /**
       * Check tag presence
       */
      expect(selectors.itemHeader(false, 'A:field1')).toBeInTheDocument();
      expect(selectors.itemHeader(false, 'A:field1')).toHaveTextContent('Group');
    });

    it('Should show editable', () => {
      render(
        getComponent({
          data: [dataFrameA, dataFrameB],
          name: 'Group 1',
          value: [
            createColumnConfig({
              field: { name: 'field1', source: 'A' },
              edit: createColumnEditConfig({ enabled: true }),
            }),
          ],
        })
      );

      /**
       * Check tag presence
       */
      expect(selectors.itemHeader(false, 'A:field1')).toBeInTheDocument();
      expect(selectors.itemHeader(false, 'A:field1')).toHaveTextContent('Editable');
    });

    it('Should show pinned left', () => {
      render(
        getComponent({
          data: [dataFrameA, dataFrameB],
          name: 'Group 1',
          value: [
            createColumnConfig({
              field: { name: 'field1', source: 'A' },
              pin: ColumnPinDirection.LEFT,
            }),
          ],
        })
      );

      /**
       * Check tag presence
       */
      expect(selectors.itemHeader(false, 'A:field1')).toBeInTheDocument();
      expect(selectors.itemHeader(false, 'A:field1')).toHaveTextContent('Pinned: Left');
    });

    it('Should show pinned right', () => {
      render(
        getComponent({
          data: [dataFrameA, dataFrameB],
          name: 'Group 1',
          value: [
            createColumnConfig({
              field: { name: 'field1', source: 'A' },
              pin: ColumnPinDirection.RIGHT,
            }),
          ],
        })
      );

      /**
       * Check tag presence
       */
      expect(selectors.itemHeader(false, 'A:field1')).toBeInTheDocument();
      expect(selectors.itemHeader(false, 'A:field1')).toHaveTextContent('Pinned: Right');
    });

    it('Should show filter', () => {
      render(
        getComponent({
          data: [dataFrameA, dataFrameB],
          name: 'Group 1',
          value: [
            createColumnConfig({
              field: { name: 'field1', source: 'A' },
              filter: createColumnFilterConfig({ enabled: true }),
            }),
          ],
        })
      );

      /**
       * Check tag presence
       */
      expect(selectors.itemHeader(false, 'A:field1')).toBeInTheDocument();
      expect(selectors.itemHeader(false, 'A:field1')).toHaveTextContent('Filterable');
    });

    it('Should show filter', () => {
      render(
        getComponent({
          data: [dataFrameA, dataFrameB],
          name: 'Group 1',
          value: [
            createColumnConfig({
              field: { name: 'field1', source: 'A' },
              sort: createColumnSortConfig({ enabled: true }),
            }),
          ],
        })
      );

      /**
       * Check tag presence
       */
      expect(selectors.itemHeader(false, 'A:field1')).toBeInTheDocument();
      expect(selectors.itemHeader(false, 'A:field1')).toHaveTextContent('Sortable');
    });
  });
});
