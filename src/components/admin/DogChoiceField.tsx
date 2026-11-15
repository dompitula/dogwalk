'use client'
import { useCallback, useId, useState } from 'react'
import { ReactSelect, FieldLabel, FieldError, FieldDescription, TextInput, useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { AGE_OPTIONS, KENNEL_OPTIONS, TEMPERAMENT_OPTIONS } from '@/lib/dog-options'

/** Payload dropdown controls with text storage for existing and custom values. */
export function DogChoiceField({ field, path, readOnly }: TextFieldClientProps) {
  const validate = useCallback((input: unknown) => {
    const text = typeof input === 'string' ? input.trim() : ''
    if (field.required && !text) return 'Please select or enter a value.'
    if (field.maxLength && text.length > field.maxLength) return 'This value is too long.'
    return true
  }, [field.required, field.maxLength])
  const { value, setValue, showError, disabled } = useField<string>({ path, validate })
  const id = useId()
  const [custom, setCustom] = useState(false)
  const choices = field.name === 'kennel' ? KENNEL_OPTIONS : field.name === 'ageLabel' ? AGE_OPTIONS : TEMPERAMENT_OPTIONS
  const allowCustom = field.name !== 'ageLabel'
  const showCustom = allowCustom && (custom || Boolean(value && !choices.includes(value)))
  const label = typeof field.label === 'string' ? field.label : field.name
  const locked = Boolean(readOnly || disabled)
  const description = field.name === 'kennel'
    ? 'Choose a kennel or enter its custom identifier. Staff only.'
    : field.name === 'ageLabel'
      ? 'Choose an age group.'
      : 'Choose a handling profile or add a custom description. Staff only.'
  const options = [...choices.map(option => ({ label: option, value: option })), ...(allowCustom ? [{ label: 'Other / custom', value: '__custom' }] : [])]
  const selectedValue = showCustom ? '__custom' : value || ''
  return <>
    <div className={'field-type select' + (showError && !showCustom ? ' error' : '')}>
      <FieldLabel htmlFor={id} label={label} required={field.required} />
      <FieldError path={path} showError={showError && !showCustom} />
      <ReactSelect
        inputId={id}
        aria-label={label}
        aria-required={field.required}
        aria-invalid={showError || undefined}
        aria-describedby={id + '-description'}
        disabled={locked}
        showError={showError && !showCustom}
        isClearable
        isSearchable
        options={options}
        value={options.find(option => option.value === selectedValue) ?? (value ? { label: value, value } : undefined)}
        menuPortalTarget={null}
        menuPosition="absolute"
        // Payload uses automatic placement internally. Anchor the rendered menu
        // below its control, even when it would otherwise choose the top.
        styles={{
          menu: base => ({ ...base, top: '100%', bottom: 'auto', marginTop: 4, marginBottom: 0 }),
          menuList: base => ({ ...base, maxHeight: 220, overflowY: 'auto' }),
        }}
        onChange={selection => {
          const next = !Array.isArray(selection) && typeof selection?.value === 'string' ? selection.value : ''
          setCustom(next === '__custom')
          setValue(next === '__custom' ? '' : next)
        }}
      />
      <div id={id + '-description'}><FieldDescription path={path} description={description} /></div>
    </div>
    {showCustom && <TextInput
      hasMany={false}
      id={id + '-custom'}
      path={path}
      label={label + ' - custom value'}
      value={value || ''}
      onChange={event => setValue(event.target.value)}
      readOnly={locked}
      required={field.required}
      showError={showError}
      placeholder="Enter a custom value"
    />}
  </>
}
