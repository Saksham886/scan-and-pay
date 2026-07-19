import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section } from "@/frontend/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service · Scan&Pay",
  description:
    "The terms governing use of the Scan&Pay QR ordering software, provided commercially by the developing IT agency.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      intro="Scan&Pay is a software product built and licensed on a commercial basis. These terms explain what the software is, what it is not, and the responsibilities of everyone who uses it."
      lastUpdated="12 June 2026"
    >
      {/* Prominent agency-stance callout */}
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-6 mb-10">
        <p className="text-[15px] leading-relaxed text-foreground">
          <strong>In short:</strong> We are an IT/software agency. We build and
          license Scan&amp;Pay as a technology product in exchange for an agreed
          commercial payment. We are <strong>not</strong> a restaurant, a food
          business, a payment company, or a party to any order or transaction
          made through the software. How a café, business, or any other user
          chooses to use this product, and anything that results from that use,
          is their responsibility, not ours.
        </p>
      </div>

      <Section n="1" title="Who we are and what these terms cover">
        <p>
          Scan&amp;Pay (the &ldquo;Platform&rdquo;, &ldquo;Software&rdquo;, or
          &ldquo;Service&rdquo;) is a QR-based ordering and payment-coordination
          software developed, owned, and licensed by{" "}
          <strong>FortyUp</strong>, an information-technology agency
          (the &ldquo;Agency&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
          &ldquo;our&rdquo;).
        </p>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use
          of the Software. By accessing, configuring, deploying, or using the
          Software in any way, whether as a café or business owner, a member of
          staff, or an end customer placing an order, you agree to these Terms.
          If you do not agree, do not use the Software.
        </p>
        <p>
          Where the Agency and a client have signed a separate written agreement,
          statement of work, or invoice, that agreement governs the commercial
          relationship and prevails over these Terms in the event of a conflict.
        </p>
      </Section>

      <Section n="2" title="Definitions">
        <ul>
          <li>
            <strong>Agency / we / us</strong>: FortyUp, the
            developer and licensor of the Software.
          </li>
          <li>
            <strong>Client</strong>: the café, restaurant, branch, business, or
            individual that licenses, deploys, or operates the Software to take
            orders from its own customers, including its owners and staff.
          </li>
          <li>
            <strong>End Customer</strong>: a person who scans a QR code and uses
            the Software to view a menu, place an order, or make a payment.
          </li>
          <li>
            <strong>Order</strong>: a request for goods or services placed by an
            End Customer with a Client through the Software.
          </li>
          <li>
            <strong>Software / Platform / Service</strong>: the Scan&amp;Pay
            web application, dashboards, APIs, and related technology.
          </li>
        </ul>
      </Section>

      <Section n="3" title="Nature of the service">
        <p>
          The Agency provides <strong>technology only</strong>. The Software is a
          tool that lets a Client publish a menu, receive Orders, coordinate
          payment through a third-party gateway, and manage its own operations.
        </p>
        <p>The Agency does not, and does not purport to:</p>
        <ul>
          <li>prepare, sell, serve, deliver, or guarantee any food, drink, or other goods;</li>
          <li>set prices, menus, taxes, availability, or fulfil any Order;</li>
          <li>act as a merchant, restaurant, cloud kitchen, or food-business operator;</li>
          <li>act as a bank, payment system, or money-transfer service; or</li>
          <li>become a party to any contract of sale formed between a Client and an End Customer.</li>
        </ul>
        <p>
          Every Order is a transaction <strong>solely between the Client and its
          End Customer</strong>. The Agency merely supplies the software through
          which that transaction is communicated.
        </p>
      </Section>

      <Section n="4" title="Commercial basis and fees">
        <p>
          The Software is built and made available on a{" "}
          <strong>commercial basis, in exchange for an agreed payment</strong>.
          The scope of work, license, pricing, billing cycle, and support terms
          are set out in the relevant proposal, agreement, or invoice between the
          Agency and the Client.
        </p>
        <p>
          Unless expressly agreed in writing, fees are non-refundable, exclusive
          of applicable taxes, and payable by the due date. The Agency is under
          no obligation to provide, host, maintain, or support the Software for
          any party that has not paid the agreed fees, and may suspend the
          Software for non-payment.
        </p>
      </Section>

      <Section n="5" title="Client responsibilities and acceptable use">
        <p>
          The Client is solely responsible for how it operates its business and
          uses the Software. In particular, the Client must:
        </p>
        <ul>
          <li>
            comply with all applicable laws and regulations, including food
            safety and hygiene (e.g. FSSAI licensing), weights and measures,
            consumer-protection, GST and other tax, labour, and data-protection
            laws;
          </li>
          <li>
            ensure that all menu items, descriptions, images, prices, taxes,
            allergen information, and availability it publishes are accurate,
            lawful, and not misleading;
          </li>
          <li>
            accept, prepare, fulfil, and stand behind the quality and safety of
            every Order it receives;
          </li>
          <li>
            obtain any consents and provide any notices required before
            collecting personal data from End Customers, and handle that data
            lawfully;
          </li>
          <li>
            keep account credentials secure and remain responsible for all
            activity under its accounts and those of its staff;
          </li>
          <li>
            not use the Software for any unlawful, fraudulent, infringing, or
            harmful purpose, and not attempt to copy, resell, reverse-engineer,
            overload, or interfere with the Software or its security.
          </li>
        </ul>
      </Section>

      <Section n="6" title="End customers">
        <p>
          The relationship for any goods or services is between the End Customer
          and the Client. Questions, complaints, refunds, cancellations, food
          quality, allergens, and order accuracy are the Client&rsquo;s
          responsibility. The Agency has no role in, and accepts no liability
          for, the fulfilment or outcome of any Order.
        </p>
      </Section>

      <Section n="7" title="Payments">
        <p>
          Payments are processed by <strong>PhonePe</strong>, a third-party
          payment gateway, and may involve other banks or payment networks. The
          Agency does <strong>not</strong> collect, process, or store card, UPI,
          or bank-account credentials; these are handled directly by the payment
          provider under its own terms and security standards.
        </p>
        <p>
          All payment settlement, refunds, chargebacks, failed transactions, and
          related disputes are governed by the payment provider&rsquo;s terms and
          are a matter between the Client, the End Customer, and the payment
          provider. The Agency is not responsible for payment-provider downtime,
          declined transactions, settlement timing, or fees.
        </p>
      </Section>

      <Section n="8" title="Third-party services">
        <p>
          The Software relies on third-party services that may include, among
          others, payment processing (PhonePe), image hosting (Cloudinary),
          application hosting and infrastructure, and optional messaging services
          (such as WhatsApp, SMS, or email providers). Your use of those services
          is subject to their own terms and privacy policies. The Agency is not
          liable for the acts, omissions, availability, or pricing of any
          third-party service.
        </p>
      </Section>

      <Section n="9" title="Intellectual property and licence">
        <p>
          All rights, title, and interest in the Software, including its source
          code, design, structure, and trademarks, belong to the Agency or its
          licensors. Subject to payment of the agreed fees and compliance with
          these Terms, the Client receives a limited, non-exclusive,
          non-transferable, revocable licence to use the Software for its own
          business operations for the duration of the engagement.
        </p>
        <p>
          The Client retains ownership of the content and data it uploads (such
          as its menu, images, and business information) and grants the Agency
          the rights needed to host and operate the Software on its behalf.
        </p>
      </Section>

      <Section n="10" title="Availability and “as is” basis">
        <p>
          The Software is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
          <strong>&ldquo;as available&rdquo;</strong>, without warranties of any
          kind, whether express or implied, including any implied warranties of
          merchantability, fitness for a particular purpose, accuracy, or
          non-infringement. The Agency does not warrant that the Software will be
          uninterrupted, error-free, secure, or free of downtime, and may perform
          maintenance, updates, or changes at any time.
        </p>
      </Section>

      <Section n="11" title="Disclaimer of responsibility">
        <p>
          The Agency built this product for commercial use as a technology
          provider only. To the fullest extent permitted by law, the Agency is
          <strong>
            {" "}
            not responsible or liable for what any Client, member of staff, or
            End Customer does with the Software
          </strong>
          , including:
        </p>
        <ul>
          <li>the quality, safety, legality, or fulfilment of any food, goods, Order, or service;</li>
          <li>the accuracy of any menu, price, tax, or information published by a Client;</li>
          <li>any business decision, loss of profit, loss of data, or reputational harm;</li>
          <li>any breach of law, regulation, or third-party rights by a Client or End Customer; or</li>
          <li>any dispute between a Client and its End Customers, staff, suppliers, or authorities.</li>
        </ul>
      </Section>

      <Section n="12" title="Limitation of liability">
        <p>
          To the maximum extent permitted by applicable law, the Agency shall not
          be liable for any indirect, incidental, special, consequential,
          punitive, or exemplary damages, or for any loss of profits, revenue,
          goodwill, or data, arising out of or relating to the Software, even if
          advised of the possibility of such damages.
        </p>
        <p>
          In all cases, the Agency&rsquo;s total aggregate liability arising out
          of or relating to the Software and these Terms shall not exceed the
          total fees actually paid by the Client to the Agency for the Software in
          the three (3) months immediately preceding the event giving rise to the
          claim.
        </p>
      </Section>

      <Section n="13" title="Indemnification">
        <p>
          The Client agrees to defend, indemnify, and hold harmless the Agency
          and its directors, employees, and contractors from and against any
          claims, damages, liabilities, penalties, and costs (including
          reasonable legal fees) arising out of or related to: the Client&rsquo;s
          use or operation of the Software; the content or data it publishes; any
          Order or transaction with an End Customer; or the Client&rsquo;s breach
          of these Terms or of any applicable law.
        </p>
      </Section>

      <Section n="14" title="Data protection">
        <p>
          The Agency&rsquo;s handling of personal data is described in our{" "}
          <Link href="/privacy">Privacy Policy</Link>. With respect to personal data of
          End Customers collected through the Software, the Client acts as the
          data controller / data fiduciary and the Agency acts as a data
          processor that handles such data on the Client&rsquo;s instructions and
          on its behalf. The Client is responsible for the lawful basis,
          notices, and consents required to collect and use that data.
        </p>
      </Section>

      <Section n="15" title="Suspension and termination">
        <p>
          The Agency may suspend or terminate access to the Software for
          non-payment, breach of these Terms, suspected misuse, security risk, or
          where required by law. The Client may stop using the Software at any
          time. Provisions that by their nature should survive termination,
          including intellectual property, disclaimers, limitation of liability,
          and indemnification, survive.
        </p>
      </Section>

      <Section n="16" title="Changes to these terms">
        <p>
          The Agency may update these Terms from time to time. Material changes
          will be reflected by updating the &ldquo;Last updated&rdquo; date above.
          Continued use of the Software after changes take effect constitutes
          acceptance of the revised Terms.
        </p>
      </Section>

      <Section n="17" title="Governing law and jurisdiction">
        <p>
          These Terms are governed by the laws of India. Subject to any separate
          written agreement, the courts at <strong>Bengaluru, India</strong> shall
          have exclusive jurisdiction over any dispute arising out of or relating
          to the Software or these Terms.
        </p>
      </Section>

      <Section n="18" title="Contact">
        <p>
          For questions about these Terms, contact{" "}
          <strong>FortyUp</strong> at{" "}
          <a href="mailto:fortyup.partnerships@gmail.com">fortyup.partnerships@gmail.com</a>,{" "}
          <strong>Bengaluru, Karnataka</strong>.
        </p>
      </Section>
    </LegalShell>
  );
}
