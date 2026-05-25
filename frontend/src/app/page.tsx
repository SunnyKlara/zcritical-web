import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import OverviewSection from '@/components/OverviewSection'
import FeaturesSection from '@/components/FeaturesSection'
import AppShowcaseSection from '@/components/AppShowcaseSection'
import SpecsSection from '@/components/SpecsSection'
import UseCasesSection from '@/components/UseCasesSection'
import ContactSection from '@/components/ContactSection'
import NewsletterSection from '@/components/NewsletterSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main id="main-content" className="relative">
      <Navbar />
      <HeroSection />
      <OverviewSection />
      <FeaturesSection />
      <AppShowcaseSection />
      <SpecsSection />
      <UseCasesSection />
      <ContactSection />
      <NewsletterSection />
      <Footer />
    </main>
  )
}
