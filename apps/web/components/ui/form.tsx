/**
 * shadcn-ui Form — minimal React 19 + react-hook-form integration.
 *
 * This is the canonical shadcn template trimmed to what the auth forms in
 * Phase 4 will need: `Form`, `FormField`, `FormItem`, `FormLabel`,
 * `FormControl`, `FormDescription`, `FormMessage`.
 *
 * No forwardRef anywhere — React 19 forwards `ref` natively.
 */
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';

import { cn } from '@/lib/cn';
import { Label } from '@/components/ui/label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error('useFormField must be used inside <FormField>');
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext?.id ?? '';

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

type FormItemProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
};

function FormItem({ className, ref, ...props }: FormItemProps) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  );
}

type FormLabelProps = React.ComponentPropsWithoutRef<typeof Label> & {
  ref?: React.Ref<React.ElementRef<typeof Label>>;
};

function FormLabel({ className, ref, ...props }: FormLabelProps) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      className={cn(error && 'text-red-600', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

type FormControlProps = React.ComponentPropsWithoutRef<typeof Slot> & {
  ref?: React.Ref<React.ElementRef<typeof Slot>>;
};

function FormControl({ ref, ...props }: FormControlProps) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
}

type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
};

function FormDescription({ className, ref, ...props }: FormDescriptionProps) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-sm text-neutral-500', className)}
      {...props}
    />
  );
}

type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
};

function FormMessage({ className, children, ref, ...props }: FormMessageProps) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? '') : children;
  if (!body) return null;
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-sm font-medium text-red-600', className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};
