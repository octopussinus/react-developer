import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './form-field';

describe('FormField', () => {
  it('associates the label with the input', () => {
    render(<FormField label="Email" />);
    // getByLabelText only resolves if htmlFor/id are wired correctly.
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('marks the field invalid and announces the error', () => {
    render(<FormField label="Email" error="Enter a valid email" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });

  it('is valid and undescribed when there is no error', () => {
    render(<FormField label="Email" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
