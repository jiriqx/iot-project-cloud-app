import { CreateZoneForm } from './_components/CreateZoneForm'

export default function CreateZonePage() {
  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Nová zóna</h1>
      <CreateZoneForm />
    </div>
  )
}
