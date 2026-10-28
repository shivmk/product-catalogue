import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { motion } from 'motion/react';
import type { EnquiryRequest, Product } from '@catalogue/shared';
import { EnquiryRequestSchema } from '@catalogue/shared/schemas';
import { useSubmitEnquiry } from '../api/catalogue';
import { ApiError } from '../api/client';
import styles from './EnquiryForm.module.css';

type FieldName = 'name' | 'email' | 'phone' | 'message';
type Values = Record<FieldName | 'website', string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyValues: Values = { name: '', email: '', phone: '', message: '', website: '' };
const fieldOrder: FieldName[] = ['name', 'email', 'phone', 'message'];

/** Same schema the API uses, so the browser and server agree on what is valid. */
function validate(product: Product, values: Values) {
  const candidate: EnquiryRequest = {
    productId: product.id,
    name: values.name,
    email: values.email.trim(),
    phone: values.phone.trim() || undefined,
    message: values.message.trim() || undefined,
    website: values.website || undefined,
  };
  const result = EnquiryRequestSchema.safeParse(candidate);
  if (result.success) return { enquiry: result.data, errors: {} };

  return { enquiry: null, errors: toFieldErrors(result.error.issues) };
}

/** Keeps only errors for fields shown on the form (the server may also report e.g. productId). */
function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): FieldErrors {
  const errors: FieldErrors = {};
  for (const { path, message } of issues) {
    const field = fieldOrder.find((candidate) => candidate === path[0]);
    if (field) errors[field] ??= message;
  }
  return errors;
}

export function EnquiryForm({ product }: { product: Product }) {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const submit = useSubmitEnquiry();
  const formRef = useRef<HTMLFormElement>(null);

  function focusField(field: FieldName) {
    const element = formRef.current?.elements.namedItem(field);
    if (element instanceof HTMLElement) element.focus();
  }

  // The form opens because the customer clicked Enquire, so move them straight into it.
  useEffect(() => focusField('name'), []);

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = fieldOrder.find((field) => fieldErrors[field]);
    if (first) focusField(first);
  }

  function update(field: keyof Values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const { enquiry, errors: fieldErrors } = validate(product, values);
    setErrors(fieldErrors);
    if (!enquiry) {
      focusFirstError(fieldErrors);
      return;
    }
    submit.mutate(enquiry, {
      onError: (error) => {
        const serverErrors =
          error instanceof ApiError
            ? toFieldErrors(
                Object.entries(error.fields).map(([field, message]) => ({
                  path: [field],
                  message,
                })),
              )
            : {};
        if (Object.keys(serverErrors).length > 0) {
          setErrors(serverErrors);
          focusFirstError(serverErrors);
        } else {
          setFormError(
            error instanceof ApiError ? error.message : 'Your enquiry could not be sent.',
          );
        }
      },
    });
  }

  if (submit.isSuccess) {
    return (
      <ThankYou product={product} email={values.email.trim()} reference={submit.data.enquiryId} />
    );
  }

  const fieldProps = (field: FieldName) => ({
    id: `enquiry-${field}`,
    name: field,
    value: values[field],
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `enquiry-${field}-error` : undefined,
  });

  const errorFor = (field: FieldName) =>
    errors[field] && (
      <p id={`enquiry-${field}-error`} className={styles.error}>
        {errors[field]}
      </p>
    );

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="enquiry-heading"
    >
      <h2 id="enquiry-heading" className={styles.heading}>
        Enquire about this product
      </h2>
      <p className={styles.intro}>Leave your details and our sales team will get back to you.</p>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="enquiry-name">Name</label>
          <input
            {...fieldProps('name')}
            type="text"
            autoComplete="name"
            onChange={(e) => update('name', e.target.value)}
          />
          {errorFor('name')}
        </div>
        <div className={styles.field}>
          <label htmlFor="enquiry-email">Email</label>
          <input
            {...fieldProps('email')}
            type="email"
            autoComplete="email"
            onChange={(e) => update('email', e.target.value)}
          />
          {errorFor('email')}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="enquiry-phone">
          Phone <span className={styles.optional}>(optional)</span>
        </label>
        <input
          {...fieldProps('phone')}
          type="tel"
          autoComplete="tel"
          onChange={(e) => update('phone', e.target.value)}
        />
        {errorFor('phone')}
      </div>

      <div className={styles.field}>
        <label htmlFor="enquiry-message">
          Message <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          {...fieldProps('message')}
          rows={4}
          onChange={(e) => update('message', e.target.value)}
        />
        {errorFor('message')}
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="enquiry-website">Website</label>
        <input
          id="enquiry-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update('website', e.target.value)}
        />
      </div>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="button" disabled={submit.isPending}>
        {submit.isPending ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}

function ThankYou({
  product,
  email,
  reference,
}: {
  product: Product;
  email: string;
  reference: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <motion.div
      className={styles.thankYou}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      role="status"
    >
      <svg viewBox="0 0 52 52" className={styles.check} aria-hidden="true">
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.path
          d="M15 27l7 7 15-15"
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.4, ease: 'easeOut' }}
        />
      </svg>
      <h2 ref={headingRef} tabIndex={-1} className={styles.heading}>
        Thank you
      </h2>
      <p>
        We&apos;ve sent your enquiry about <strong>{product.title}</strong> to our sales team. They
        will reply to <strong>{email}</strong>.
      </p>
      <p className={styles.reference}>Reference: {reference}</p>
    </motion.div>
  );
}
