/**
 * Select — native styled select element.
 * Usage: <Select id="type" label="Architecture type" options={[{value,label}]} />
 */
import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export function Select({ label, error, options, id, className, ...rest }: SelectProps) {
  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <select
        {...rest}
        id={id}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={[styles.select, error ? styles.hasError : '', className ?? '']
          .filter(Boolean)
          .join(' ')}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
