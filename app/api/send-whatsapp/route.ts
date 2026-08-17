import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { phone, pdfUrl, receiptNumber } = await req.json()

    const INSTANCE = process.env.ULTRAMSG_INSTANCE
    const TOKEN = process.env.ULTRAMSG_TOKEN

    if (!INSTANCE || !TOKEN) {
      return NextResponse.json({ error: 'UltraMsg keys missing in .env.local' }, { status: 500 })
    }

    // FIX: Don't fail if no phone. Just return success
    if (!phone) {
      return NextResponse.json({ success: true, message: 'No phone number provided. Skipped WhatsApp.' }, { status: 200 })
    }

    const message = `Hello 👋 
Your receipt from ${'SHOPAI STORE'}

Receipt: ${receiptNumber}
Please find your PDF attached. Thank you!`

    const url = `https://api.ultramsg.com/${INSTANCE}/messages/document`

    const formData = new FormData()
    formData.append('token', TOKEN)
    formData.append('to', phone) // phone is already formatted to 256...
    formData.append('filename', `${receiptNumber}.pdf`)
    formData.append('document', pdfUrl)
    formData.append('caption', message)

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('UltraMsg Error:', data)
      return NextResponse.json({ error: data }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}