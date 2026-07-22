"use client";

import { useId } from "react";
import { type InputProps , Input } from "./input";

import { type SelectProps , Select } from "./select";

import { type DateInputProps , DateInput } from "./date-input";

import { type AutocompleteInputProps , AutocompleteInput } from "./autocomplete-input";

import { cn } from "@/lib/utils";

interface BaseFormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

interface FormFieldInputProps extends BaseFormFieldProps {
  type: "input";
  inputProps: InputProps;
}

interface FormFieldSelectProps extends BaseFormFieldProps {
  type: "select";
  inputProps: SelectProps;
}

interface FormFieldDateProps extends BaseFormFieldProps {
  type: "date";
  inputProps: DateInputProps;
}

interface FormFieldAutocompleteProps extends BaseFormFieldProps {
  type: "autocomplete";
  inputProps: AutocompleteInputProps;
}

type FormFieldProps =
  | FormFieldInputProps
  | FormFieldSelectProps
  | FormFieldDateProps
  | FormFieldAutocompleteProps;

export function FormField(props: FormFieldProps) {
  const { label, error, hint, required, className } = props;
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const a11yProps: {
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-required'?: boolean;
  } = {
    ...(error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}),
    ...(!error && hint ? { 'aria-describedby': hintId } : {}),
    ...(required ? { 'aria-required': true } : {}),
  };

  const renderInput = () => {
    switch (props.type) {
      case "input":
        return (
          <Input
            id={fieldId}
            {...props.inputProps}
            {...a11yProps}
            error={error}
          />
        );
      case "select":
        return (
          <Select
            id={fieldId}
            {...props.inputProps}
            {...a11yProps}
            error={error}
          />
        );
      case "date":
        return (
          <DateInput id={fieldId} {...props.inputProps} {...a11yProps} />
        );
      case "autocomplete":
        return (
          <AutocompleteInput
            id={fieldId}
            {...props.inputProps}
            {...a11yProps}
          />
        );
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-sm font-medium text-dark dark:text-white"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {renderInput()}
      {hint && !error && (
        <p
          id={hintId}
          className="mt-1 text-xs text-gray-500 dark:text-gray-400"
        >
          {hint}
        </p>
      )}
      {error && (
        <div
          id={errorId}
          className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          <svg
            className="h-4 w-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}



