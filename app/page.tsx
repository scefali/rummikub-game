import { HomeClient } from "@/components/home-client"

interface HomePageProps {
  searchParams: Promise<{ join?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { join } = await searchParams

  return <HomeClient joinCode={join?.toUpperCase()} />
}
