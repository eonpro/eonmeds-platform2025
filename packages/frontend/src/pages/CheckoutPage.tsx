import React, { useState } from "react";
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import axios from 'axios';

// Initialize Stripe (we'll get the key from environment)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

// ✅ Main Checkout Page Component
export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("US");
  const [promo, setPromo] = useState("");
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });

  // Billing address state  
  const [billingAddress, setBillingAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });

  // 🔽 Plan options (edit prices, perks, and copy as needed)
  const plans = [
    {
      id: "p1",
      label: "1 Month",
      months: 1,
      price: 299,
      perMonth: 299,
      badge: null,
      blurb: "Try it for a month — includes telehealth & weekly follow‑ups.",
      perks: [
        "Telehealth consult as needed",
        "Weekly specialist check‑ins",
        "Direct‑to‑home shipping",
      ],
    },
    {
      id: "p3",
      label: "3 Months",
      months: 3,
      price: 849, // ~$283/mo
      perMonth: 283,
      badge: "Popular",
      blurb: "Save vs monthly with a 3‑month plan.",
      perks: [
        "Everything in 1‑month plan",
        "Priority pharmacy queue",
        "Concierge support",
      ],
    },
    {
      id: "p6",
      label: "6 Months",
      months: 6,
      price: 1599, // ~$266/mo
      perMonth: 266,
      badge: "Best value",
      blurb: "Our best price for committed progress.",
      perks: [
        "Everything in 3‑month plan",
        "Coach guidance for milestones",
        "VIP replacement support",
      ],
    },
  ];

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0].id);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)!;

  const shipping = 0.0;
  const discount = 0.0; // apply when promo validated
  const taxRate = 0.0875; // 8.75% tax for example
  const subtotal = selectedPlan.price;
  const tax = +(subtotal - discount) * taxRate;
  const total = +(subtotal - discount + shipping + tax).toFixed(2);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setError("Stripe is not loaded yet. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      // Create payment intent on backend
      const { data } = await axios.post('/api/v1/checkout/create-session', {
        plan_id: selectedPlanId,
        plan_months: selectedPlan.months,
        amount: Math.round(total * 100), // Convert to cents
        customer: {
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
        },
        shipping_address: sameAsShipping ? shippingAddress : shippingAddress,
        billing_address: sameAsShipping ? shippingAddress : billingAddress,
      });

      // Confirm the payment with Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${firstName} ${lastName}`,
            email: email,
            phone: phone,
            address: sameAsShipping ? shippingAddress : billingAddress,
          },
        },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
      } else {
        // Payment successful - redirect to success page
        window.location.href = `/checkout-success?payment_intent=${result.paymentIntent?.id}`;
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || err.message || "Something went wrong with your payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-green-600 text-white font-semibold">E</span>
            <span className="font-semibold tracking-tight">EON Checkout</span>
          </div>
          <div className="hidden items-center gap-3 text-xs text-gray-600 md:flex">
            <LockIcon className="h-4 w-4" />
            <span>Secure checkout</span>
            <span className="mx-2">•</span>
            <span>Need help? <a className="underline" href="mailto:support@eonpro.app">Contact support</a></span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-12">
        {/* Left column: forms */}
        <section className="lg:col-span-7 xl:col-span-8">
          {/* Progress / steps */}
          <nav aria-label="Checkout steps" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-gray-500">
              <li className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">1</span>
                <span>Choose Plan</span>
              </li>
              <Chevron className="h-4 w-4" />
              <li className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">2</span>
                <span>Contact</span>
              </li>
              <Chevron className="h-4 w-4" />
              <li className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">3</span>
                <span>Shipping</span>
              </li>
              <Chevron className="h-4 w-4" />
              <li className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">4</span>
                <span>Payment</span>
              </li>
            </ol>
          </nav>

          {/* 👇 Plan selector */}
          <Card title="Choose your plan">
            <PackageSelector
              plans={plans}
              selectedId={selectedPlanId}
              onSelect={setSelectedPlanId}
            />
          </Card>

          {/* Contact */}
          <Card title="Contact information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" required>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="input"
                  required
                />
              </Field>
              <Field label="Last Name" required>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="input"
                  required
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="input"
                  required
                />
              </Field>
              <Field label="Phone" required>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555‑5555"
                  className="input"
                  required
                />
              </Field>
            </div>
          </Card>

          {/* Shipping */}
          <Card title="Shipping address">
            <AddressBlock
              address={shippingAddress}
              setAddress={setShippingAddress}
              country={country}
              setCountry={setCountry}
            />
          </Card>

          {/* Billing */}
          <Card title="Billing address">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => setSameAsShipping(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">Same as shipping</span>
            </label>
            {!sameAsShipping && (
              <div className="mt-4">
                <AddressBlock
                  address={billingAddress}
                  setAddress={setBillingAddress}
                  country={country}
                  setCountry={setCountry}
                />
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card title="Payment">
            <form onSubmit={submit} className="flex flex-col gap-4">
              {/* Stripe Card Element */}
              <div className="rounded-2xl border border-gray-200 p-4">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                  <LockIcon className="h-4 w-4" />
                  <span>256‑bit encryption • PCI‑DSS compliant gateway</span>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Shield className="h-4 w-4"/> 30‑day cancel anytime
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Truck className="h-4 w-4"/> Fast home delivery
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !stripe}
                className="btn-primary"
              >
                {loading ? "Processing…" : `Pay $${total.toFixed(2)}`}
              </button>
              <p className="text-xs text-gray-600">
                By clicking pay, you agree to our{" "}
                <a className="underline" href="/terms">Terms</a>,{" "}
                <a className="underline" href="/privacy">Privacy</a>, and to receive care-related texts/emails.
              </p>
            </form>
          </Card>

          {/* FAQ / reassurance */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Reassure icon={<Shield className="h-5 w-5"/>} title="Safe & secure" desc="HIPAA‑ready platform, SOC2 practices." />
            <Reassure icon={<Support className="h-5 w-5"/>} title="Concierge support" desc="8am–9pm ET, 7 days a week." />
            <Reassure icon={<Refresh className="h-5 w-5"/>} title="Flexible" desc="Pause, change, or cancel anytime." />
          </div>
        </section>

        {/* Right column: summary */}
        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-24">
            <OrderSummary
              selectedPlan={selectedPlan}
              shipping={shipping}
              discount={discount}
              tax={tax}
              total={total}
              promo={promo}
              setPromo={setPromo}
            />

            <TrustedBadges />
          </div>
        </aside>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-xs text-gray-600">
        <div className="mx-auto max-w-6xl px-4">
          <p>
            © {new Date().getFullYear()} EON Medical + Wellness. 
            This checkout is secured by Stripe and is HIPAA compliant.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------- UI Primitives --------------------------- */
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {title && <h2 className="mb-4 text-base font-semibold tracking-tight">{title}</h2>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-800">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

interface AddressProps {
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  setAddress: (address: any) => void;
  country: string;
  setCountry: (country: string) => void;
}

function AddressBlock({ address, setAddress, country, setCountry }: AddressProps) {
  const updateField = (field: string, value: string) => {
    setAddress((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Address" required>
          <input
            className="input"
            placeholder="123 Wellness Ave"
            value={address.line1}
            onChange={(e) => updateField('line1', e.target.value)}
            autoComplete="address-line1"
            required
          />
        </Field>
      </div>
      <Field label="Apt, suite (optional)">
        <input
          className="input"
          placeholder="#1203"
          value={address.line2}
          onChange={(e) => updateField('line2', e.target.value)}
          autoComplete="address-line2"
        />
      </Field>
      <Field label="City" required>
        <input
          className="input"
          placeholder="Tampa"
          value={address.city}
          onChange={(e) => updateField('city', e.target.value)}
          autoComplete="address-level2"
          required
        />
      </Field>
      <Field label="State" required>
        <input
          className="input"
          placeholder="FL"
          value={address.state}
          onChange={(e) => updateField('state', e.target.value)}
          autoComplete="address-level1"
          required
        />
      </Field>
      <Field label="ZIP" required>
        <input
          className="input"
          inputMode="numeric"
          placeholder="33601"
          value={address.postal_code}
          onChange={(e) => updateField('postal_code', e.target.value)}
          autoComplete="postal-code"
          required
        />
      </Field>
      <Field label="Country" required>
        <select
          className="input"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="US">United States</option>
          <option value="PR">Puerto Rico</option>
          <option value="CA">Canada</option>
        </select>
      </Field>
    </div>
  );
}

/* ---------------------- Packages (expandable boxes) ---------------------- */
interface PlanType {
  id: string;
  label: string;
  months: number;
  price: number;
  perMonth: number;
  badge: string | null;
  blurb: string;
  perks: string[];
}

function PackageSelector({ plans, selectedId, onSelect }: { plans: PlanType[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-3">
      {plans.map((plan) => (
        <ExpandablePackage
          key={plan.id}
          plan={plan}
          selected={selectedId === plan.id}
          onClick={() => onSelect(plan.id)}
        />
      ))}
    </div>
  );
}

function ExpandablePackage({ plan, selected, onClick }: { plan: PlanType; selected: boolean; onClick: () => void }) {
  return (
    <div
      role="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-4 transition-all cursor-pointer",
        selected ? "border-green-600 bg-green-50 shadow-md" : "border-gray-200 bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={[
              "grid h-5 w-5 place-items-center rounded-full border",
              selected ? "border-green-600" : "border-gray-300",
            ].join(" ")}
          >
            <span className={["h-3 w-3 rounded-full", selected ? "bg-green-600" : "bg-transparent"].join(" ")}></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{plan.label}</span>
              {plan.badge && (
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {plan.badge}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600">{plan.blurb}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">${plan.price.toFixed(2)}</div>
          <div className="text-xs text-gray-600">≈ ${plan.perMonth}/mo</div>
        </div>
      </div>

      {/* Expanded content */}
      {selected && (
        <div className="mt-3 border-t border-dashed border-gray-300 pt-3">
          <ul className="mb-3 grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
            {plan.perks.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-green-600"/>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <Shield className="h-4 w-4"/> Cancel anytime • <Truck className="h-4 w-4"/> Fast shipping • <LockIcon className="h-4 w-4"/> Secure
          </div>
        </div>
      )}
    </div>
  );
}

function OrderSummary({ selectedPlan, shipping, discount, tax, total, promo, setPromo }: any) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold tracking-tight">Order summary</h3>

      {/* Line items */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-100" />
          <div className="flex-1 text-sm">
            <div className="font-medium">{selectedPlan.label} plan</div>
            <div className="text-gray-600">Includes telehealth & weekly follow‑ups</div>
          </div>
          <div className="text-sm font-medium">${selectedPlan.price.toFixed(2)}</div>
        </div>
      </div>

      {/* Promo code */}
      <div className="mb-4 flex gap-2">
        <input
          className="input"
          placeholder="Promo code"
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
        />
        <button className="btn-outline" onClick={() => alert("Promo codes coming soon!")}>
          Apply
        </button>
      </div>

      <dl className="mb-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Subtotal</dt>
          <dd className="font-medium">${selectedPlan.price.toFixed(2)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between text-green-600">
            <dt>Discount</dt>
            <dd>- ${discount.toFixed(2)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Shipping</dt>
          <dd className="font-medium">{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</dd>
        </div>
        {tax > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-gray-600">Estimated tax</dt>
            <dd className="font-medium">${tax.toFixed(2)}</dd>
          </div>
        )}
      </dl>

      <div className="mb-4 flex items-center justify-between border-t border-dashed border-gray-300 pt-3 text-sm">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">${total.toFixed(2)}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-600">
        <img
          alt="cards"
          className="h-5"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='20'%3E%3Crect fill='%23ddd' rx='3' width='40' height='20'/%3E%3Crect fill='%23ddd' x='48' rx='3' width='48' height='20'/%3E%3C/svg%3E"
        />
        <span>We accept major cards & HSA/FSA (where applicable).</span>
      </div>
    </div>
  );
}

function TrustedBadges() {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-600 shadow-sm">
      <div className="flex items-center gap-3"><LockIcon className="h-4 w-4"/> Encrypted & secure • PCI DSS</div>
      <div className="flex items-center gap-3"><Shield className="h-4 w-4"/> HIPAA compliant healthcare platform</div>
      <div className="flex items-center gap-3"><Star className="h-4 w-4"/> Thousands of 5‑star patient reviews</div>
      <div className="flex items-center gap-3"><Check className="h-4 w-4"/> 30‑second checkout • Mobile‑first</div>
    </div>
  );
}

function Reassure({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
      <p className="text-xs text-gray-600">{desc}</p>
    </div>
  );
}

/* ------------------------------ Icons ------------------------------- */
function LockIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2"/>
      <path d="M8 10V7a4 4 0 1 1 8 0v3"/>
    </svg>
  );
}

function Chevron(props: any) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M7 5l5 5-5 5"/>
    </svg>
  );
}

function Shield(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z"/>
    </svg>
  );
}

function Truck(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M3 7h11v7H3z"/>
      <path d="M14 10h4l3 3v1h-7z"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="18" cy="18" r="2"/>
    </svg>
  );
}

function Support(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M6 20v-2a4 4 0 0 1 4-4h4"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function Refresh(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66"/>
      <path d="M20 4v6h-6"/>
    </svg>
  );
}

function Star(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  );
}

function Check(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

/* --------------------------- CSS Classes --------------------------- */
const styles = `
<style>
  .input {
    width: 100%;
    border-radius: 0.75rem;
    border: 1px solid rgb(229 231 235);
    background-color: white;
    padding: 0.625rem 0.75rem;
    outline: none;
    transition: all 0.2s;
  }
  
  .input:focus {
    border-color: rgb(34 197 94);
    box-shadow: 0 0 0 3px rgb(34 197 94 / 0.1);
  }
  
  .btn-primary {
    display: inline-flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    border-radius: 0.75rem;
    background-color: rgb(34 197 94);
    padding: 0.75rem 1rem;
    color: white;
    font-weight: 600;
    transition: opacity 0.2s;
    border: none;
    cursor: pointer;
  }
  
  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.75rem;
    border: 1px solid rgb(229 231 235);
    background-color: white;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.2s;
    cursor: pointer;
  }
  
  .btn-outline:hover {
    background-color: rgb(249 250 251);
  }
</style>
`;

// Add the styles to the document head
if (typeof document !== 'undefined' && !document.getElementById('checkout-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'checkout-styles';
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
}
