// Export the exact same CSS string so you can keep: <style>{checkboxGreenStyle}</style>
export const checkboxGreenStyle = `
/* Brand checkbox: fixed size everywhere (20px) */
.brand-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #00824E;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  position: relative;
  margin-right: 0.75rem;
  vertical-align: middle;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
}
.brand-checkbox:checked {
  background-color: #00824E;
  border-color: #00824E;
}
/* Tick mark sized/positioned for 20px box */
.brand-checkbox:checked:after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 6px;
  height: 11px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  pointer-events: none;
  display: block;
}
.brand-checkbox:indeterminate {
  background-color: #00824E;
  border-color: #00824E;
}
/* Centered bar for indeterminate (20px box) */
.brand-checkbox:indeterminate:after {
  content: '';
  position: absolute;
  left: 4px; top: 8.5px;
  width: 12px; height: 3px;
  background: #fff; border-radius: 1px; display: block;
}
/* Disabled look */
.brand-checkbox:disabled {
  border-color: #D1D5DB; background: #F9FAFB; cursor: not-allowed;
}
.brand-checkbox:disabled:checked,
.brand-checkbox:disabled:indeterminate {
  background-color: #9CA3AF; border-color: #9CA3AF;
}
`;

export default function BrandCheckboxStyles() {
  return <style>{checkboxGreenStyle}</style>;
}
