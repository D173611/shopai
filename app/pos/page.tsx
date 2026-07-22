import { redirect } from 'next/navigation'

export default function PosRedirect() {
  // Send them to login or pick a default shop
  redirect('/login')
  // Or redirect('/myshop/cashier/orders') if you have 1 default shop
}