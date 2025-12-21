import { useState, useCallback } from "react";

export interface ValidationRule {
  validator: (value: unknown) => boolean;
  message: string;
}

export interface FieldValidation {
  [fieldName: string]: string | undefined;
}

/**
 * Hook para manejo de validación de formularios
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules?: Partial<Record<keyof T, ValidationRule[]>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldValidation>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback(
    (fieldName: keyof T, value: unknown): string | undefined => {
      if (!validationRules || !validationRules[fieldName]) {
        return undefined;
      }

      const rules = validationRules[fieldName]!;
      for (const rule of rules) {
        if (!rule.validator(value)) {
          return rule.message;
        }
      }

      return undefined;
    },
    [validationRules]
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: FieldValidation = {};
    let isValid = true;

    Object.keys(values).forEach((key) => {
      const fieldName = key as keyof T;
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  const setValue = useCallback(
    (fieldName: keyof T, value: T[keyof T], validate = true) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }));

      if (validate && touched[fieldName]) {
        const error = validateField(fieldName, value);
        setErrors((prev) => ({
          ...prev,
          [fieldName]: error,
        }));
      }
    },
    [touched, validateField]
  );

  const setFieldTouched = useCallback((fieldName: keyof T) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));

    // Validar al tocar
    const error = validateField(fieldName, values[fieldName]);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  }, [values, validateField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setAllErrors = useCallback((newErrors: FieldValidation) => {
    setErrors(newErrors);
  }, []);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    validateField,
    reset,
    setAllErrors,
    isValid: Object.keys(errors).length === 0 && Object.keys(touched).length > 0,
  };
}



