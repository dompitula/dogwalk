'use client'
import { useRef } from 'react'
import { FormSubmit, SaveButton, useDocumentInfo, useEditDepth, useForm, useHotkey, useTranslation } from '@payloadcms/ui'

export function DogSaveButton() {
  const { isEditing } = useDocumentInfo()
  const depth = useEditDepth()
  // Keep Payload's normal behavior for edits and relationship drawers.
  return isEditing || depth >= 2 ? <SaveButton /> : <CreateDogSaveButton />
}

function CreateDogSaveButton() {
  const { submit } = useForm()
  const { uploadStatus } = useDocumentInfo()
  const { t } = useTranslation()
  const depth = useEditDepth()
  const ref = useRef<HTMLButtonElement>(null)
  const saving = useRef(false)
  useHotkey({ cmdCtrlKey: true, editDepth: depth, keyCodes: ['s'] }, event => {
    event.preventDefault()
    event.stopPropagation()
    ref.current?.click()
  })
  async function save() {
    if (saving.current || uploadStatus === 'uploading') return
    saving.current = true
    try {
      const result = await submit()
      if (result?.res.ok) window.location.assign('/dashboard?view=dogs&created=1')
    } finally {
      saving.current = false
    }
  }
  return <FormSubmit buttonId="action-save" ref={ref} size="medium" type="button" disabled={uploadStatus === 'uploading'} onClick={save}>{t('general:save')}</FormSubmit>
}
