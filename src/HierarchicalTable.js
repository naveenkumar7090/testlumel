import React, { useState, useRef } from "react";

const initialData = [
  {
    id: "electronics",
    label: "Electronics",
    children: [
      {
        id: "phones",
        label: "Phones",
        value: 800,
      },
      {
        id: "laptops",
        label: "Laptops",
        value: 700,
      },
    ],
  },
  {
    id: "furniture",
    label: "Furniture",
    children: [
      {
        id: "tables",
        label: "Tables",
        value: 300,
      },
      {
        id: "chairs",
        label: "Chairs",
        value: 700,
      },
    ],
  },
];

function calculateValue(row) {
  if (row.children) {
    return row.children.reduce((sum, child) => sum + calculateValue(child), 0);
  }
  if (row.value !== undefined) return Number(row.value) || 0;
  return 0;
}

// Helper to flatten rows and store initial values by id
function getInitialValues(rows, map = {}) {
  rows.forEach((row) => {
    if (row.value !== undefined) {
      map[row.id] = Number(row.value) || 0;
    }
    if (row.children) {
      getInitialValues(row.children, map);
    }
  });
  return map;
}

function calculateVariance(row, initialValues) {
  if (row.value !== undefined) {
    const initial = initialValues[row.id] || 0;
    const current = Number(row.value) || 0;
    if (initial === 0) return "0%";
    const percentChange = ((current - initial) / initial) * 100;
    return percentChange.toFixed(2) + "%";
  }
  if (row.children) {
    // For parent rows, calculate weighted average percentage change based on initial values
    let totalInitial = 0;
    let totalCurrent = 0;
    row.children.forEach((child) => {
      const initial = initialValues[child.id] || 0;
      const current = child.value !== undefined ? Number(child.value) || 0 : 0;
      totalInitial += initial;
      totalCurrent += current;
    });
    if (totalInitial === 0) return "0%";
    const percentChange = ((totalCurrent - totalInitial) / totalInitial) * 100;
    return percentChange.toFixed(2) + "%";
  }
  return "0%";
}

function distributeValueToChildren(children, addedValue, initialValues) {
  // Calculate total initial value of children
  const totalInitial = children.reduce(
    (sum, child) => sum + (initialValues[child.id] || 0),
    0
  );
  return children.map((child) => {
    const childInitial = initialValues[child.id] || 0;
    const share =
      totalInitial === 0 ? 0 : (childInitial / totalInitial) * addedValue;
    if (child.children) {
      return {
        ...child,
        children: distributeValueToChildren(
          child.children,
          share,
          initialValues
        ),
      };
    } else {
      return {
        ...child,
        value: Math.round((Number(child.value) || 0) + share),
      };
    }
  });
}

function applyPercentageToChildren(children, percent) {
  return children.map((child) => {
    if (child.children) {
      return {
        ...child,
        children: applyPercentageToChildren(child.children, percent),
      };
    } else {
      const currentValue = Number(child.value) || 0;
      const addValue = (currentValue * percent) / 100;
      return {
        ...child,
        value: Math.round(currentValue + addValue),
      };
    }
  });
}

function updateRowByIdWithChildren(rows, id, updater) {
  return rows.map((row) => {
    if (row.id === id) {
      return updater(row);
    } else if (row.children) {
      return {
        ...row,
        children: updateRowByIdWithChildren(row.children, id, updater),
      };
    }
    return row;
  });
}

function updateRowById(rows, id, field, value) {
  return rows.map((row) => {
    if (row.id === id) {
      return { ...row, [field]: value };
    } else if (row.children) {
      return {
        ...row,
        children: updateRowById(row.children, id, field, value),
      };
    }
    return row;
  });
}

function setChildrenProportionalToInitial(children, newTotal, initialValues) {
  // Calculate total initial value of children
  const totalInitial = children.reduce(
    (sum, child) => sum + (initialValues[child.id] || 0),
    0
  );
  return children.map((child) => {
    const childInitial = initialValues[child.id] || 0;
    // Proportional share
    const share =
      totalInitial === 0 ? 0 : (childInitial / totalInitial) * newTotal;
    if (child.children) {
      return {
        ...child,
        children: setChildrenProportionalToInitial(
          child.children,
          share,
          initialValues
        ),
      };
    } else {
      return {
        ...child,
        value: Math.round(share),
      };
    }
  });
}

function renderRows(
  rows,
  handleInputChange,
  handleAddInputToValue,
  handleAddPercentageToValue,
  initialValues,
  level = 0
) {
  return rows.map((row) => (
    <React.Fragment key={row.id}>
      <tr>
        <td style={{ paddingLeft: 20 * level }}>{row.label}</td>
        <td>{calculateValue(row)}</td>
        <td>
          <input
            type="text"
            value={row.col1 || ""}
            onChange={(e) => handleInputChange(row.id, "col1", e.target.value)}
          />
        </td>
        <td>
          <button onClick={() => handleAddInputToValue(row)}>Add unit</button>
        </td>
        <td>
          <button onClick={() => handleAddPercentageToValue(row)}>
            Add Percentage
          </button>
        </td>
        <td>{calculateVariance(row, initialValues)}</td>
      </tr>
      {row.children &&
        renderRows(
          row.children,
          handleInputChange,
          handleAddInputToValue,
          handleAddPercentageToValue,
          initialValues,
          level + 1
        )}
    </React.Fragment>
  ));
}

export default function HierarchicalTable() {
  const [data, setData] = useState(initialData);
  const initialValuesRef = useRef(getInitialValues(initialData));

  const handleInputChange = (id, field, value) => {
    setData((prevData) => updateRowById(prevData, id, field, value));
  };

  const handleAddInputToValue = (row) => {
    const inputValue = Number(row.col1);
    if (!isNaN(inputValue) && inputValue !== 0) {
      if (row.children) {
        // For parent: set value to input, set children proportional to their original contribution
        setData((prevData) =>
          updateRowByIdWithChildren(prevData, row.id, (targetRow) => ({
            ...targetRow,
            children: setChildrenProportionalToInitial(
              targetRow.children,
              inputValue,
              initialValuesRef.current
            ),
          }))
        );
      } else {
        setData((prevData) =>
          updateRowById(
            prevData,
            row.id,
            "value",
            (Number(row.value) || 0) + inputValue
          )
        );
      }
      setData((prevData) => updateRowById(prevData, row.id, "col1", ""));
    }
  };

  const handleAddPercentageToValue = (row) => {
    const inputValue = Number(row.col1);
    const currentValue = calculateValue(row);
    if (!isNaN(inputValue) && inputValue !== 0) {
      if (row.children) {
        setData((prevData) =>
          updateRowByIdWithChildren(prevData, row.id, (targetRow) => ({
            ...targetRow,
            children: applyPercentageToChildren(targetRow.children, inputValue),
          }))
        );
      } else {
        const addValue = (currentValue * inputValue) / 100;
        setData((prevData) =>
          updateRowById(prevData, row.id, "value", currentValue + addValue)
        );
      }
      setData((prevData) => updateRowById(prevData, row.id, "col1", ""));
    }
  };

  return (
    <table
      border="1"
      cellPadding="8"
      style={{ width: "100%", borderCollapse: "collapse" }}
    >
      <thead>
        <tr>
          <th>Label</th>
          <th>Value</th>
          <th>Input</th>
          <th>Allocation Unit</th>
          <th>Allocation Values</th>
          <th>Variance</th>
        </tr>
      </thead>
      <tbody>
        {renderRows(
          data,
          handleInputChange,
          handleAddInputToValue,
          handleAddPercentageToValue,
          initialValuesRef.current
        )}
      </tbody>
    </table>
  );
}
