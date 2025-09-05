import React from 'react';

const MockSelect = ({ value, onValueChange, children, disabled }: any) => {
  const [selectedValue, setSelectedValue] = React.useState(value);

  const options = React.Children.map(children, (child) => {
    if (child.type.name === 'SelectContent') {
      return React.Children.map(child.props.children, (item) => {
        if (item.type.name === 'SelectItem') {
          return (
            <option key={item.props.value} value={item.props.value}>
              {item.props.children}
            </option>
          );
        }
        return null;
      }).filter(Boolean);
    }
    return null;
  }).filter(Boolean).flat();

  React.useEffect(() => {
    if (value !== selectedValue) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <select
      value={selectedValue || ''}
      onChange={handleChange}
      disabled={disabled}
      data-testid="mock-select"
    >
      {options || []}
    </select>
  );
};

const MockSelectTrigger = () => null;

const MockSelectContent = ({ children }: any) => children;

const MockSelectItem = ({ value, children }: any) => (
  <option value={value}>{children}</option>
);

const MockSelectValue = () => null;

// Add a test to avoid the "Your test suite must contain at least one test" error
describe('Mock Select Component', () => {
  it('is a mock component', () => {
    expect(true).toBe(true);
  });
});

export {
  MockSelect as Select,
  MockSelectTrigger as SelectTrigger,
  MockSelectContent as SelectContent,
  MockSelectItem as SelectItem,
  MockSelectValue as SelectValue
};