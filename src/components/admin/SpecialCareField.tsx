'use client'
import { useId } from 'react'
import { FieldDescription, FieldError, FieldLabel, ReactSelect, useField } from '@payloadcms/ui'
import type { SelectFieldClientProps } from 'payload'
import { SPECIAL_CARE_OPTIONS } from '@/lib/dog-options'

export function SpecialCareField({ field, path, readOnly }: SelectFieldClientProps) {
  const { value, setValue, showError, disabled } = useField<string[]>({ path })
  const id = useId()
  const options = SPECIAL_CARE_OPTIONS.map((option) => ({ label: option, value: option }))
  return (
    <div className={'field-type select select--has-many' + (showError ? ' error' : '')}>
      <FieldLabel htmlFor={id} label={field.label} required={field.required} />
      <FieldError path={path} showError={showError} />
      <ReactSelect
        inputId={id}
        aria-label="Special care needs"
        aria-invalid={showError || undefined}
        aria-describedby={id + '-description'}
        disabled={Boolean(readOnly || disabled)}
        showError={showError}
        isMulti
        isClearable
        isSearchable
        options={options}
        value={(value || []).map((selected) => ({ label: selected, value: selected }))}
        onChange={(selection) =>
          setValue(Array.isArray(selection) ? selection.map((option) => option.value) : [])
        }
        menuPortalTarget={null}
        menuPosition="absolute"
        styles={{
          menu: (base) => ({ ...base, top: '100%', bottom: 'auto', marginTop: 4, marginBottom: 0 }),
          menuList: (base) => ({ ...base, maxHeight: 220, overflowY: 'auto' }),
        }}
      />
      <div id={id + '-description'}>
        <FieldDescription
          path={path}
          description="Select all known care needs. Leave empty if none are recorded. Staff only."
        />
      </div>
    </div>
  )
}
