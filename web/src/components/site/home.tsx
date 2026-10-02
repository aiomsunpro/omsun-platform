"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  Menu, X, Phone, MessageCircle, MapPin, Mail, ArrowRight, CheckCircle2,
  Banknote, Wallet, Smartphone, Tv, Zap, Shield, CreditCard, FileText,
  Landmark, Building2, Tractor, GraduationCap, Car, ScrollText, Receipt,
  Users, Store, Award, TrendingUp, Headphones, Lock, Network, Sparkles,
  Search, LogIn, Star, Quote,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
  Button, Card, CardContent, Input, Label, Textarea, Toaster, toast,
} from "@/components/site/ui";
import { Facebook, Instagram, Twitter, Youtube } from "@/components/site/brand-icons";
import { submitEnquiry, trackRequest, type TrackResult } from "@/components/site/actions";

const logo = "/site/logo.jpg";
const hero = "/site/hero.jpg";
const whatsappIcon = "/site/whatsapp.png";

// Staff (owner, managers, staff) sign in on this site's OMSUN login page.
const STAFF_LOGIN_URL = "/login";

const nav = [
  { label: "मुख्यपृष्ठ", href: "#home" },
  { label: "सेवा", href: "#services" },
  { label: "फ्रँचायझी बुकिंग", href: "#franchise" },
  { label: "स्टेटस ट्रॅकिंग", href: "#status" },
  { label: "कर्मचारी लॉगिन", href: STAFF_LOGIN_URL },
  { label: "संपर्क", href: "#contact" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled ? "bg-white/95 shadow-md backdrop-blur" : "bg-white"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8 text-2xl">
        <a href="#home" className="flex items-center gap-2">
          <img src={logo} alt="OMSUN E सेवा केंद्र लोगो" className="h-12 w-auto" />
        </a>
        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((n) => {
            const className = "text-sm font-semibold text-[#0b1f4d] transition-colors hover:text-[#2563eb]";
            return n.href.startsWith("/") ? (
              <Link key={n.href} href={n.href} className={className}>{n.label}</Link>
            ) : (
              <a key={n.href} href={n.href} className={className}>{n.label}</a>
            );
          })}
        </nav>
        <div className="hidden lg:block">
          <Button
            asChild
            className="bg-[#2563eb] font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-[#1d4ed8]"
          >
            <a href="#contact">अर्ज करा</a>
          </Button>
        </div>
        <button
          aria-label="Menu"
          className="rounded-md p-2 text-[#0b1f4d] lg:hidden"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-white lg:hidden">
          <div className="flex flex-col px-4 py-3">
            {nav.map((n) => {
              const className = "rounded-md px-3 py-3 text-sm font-semibold text-[#0b1f4d] hover:bg-blue-50 hover:text-[#2563eb]";
              const close = () => setOpen(false);
              return n.href.startsWith("/") ? (
                <Link key={n.href} href={n.href} onClick={close} className={className}>{n.label}</Link>
              ) : (
                <a key={n.href} href={n.href} onClick={close} className={className}>{n.label}</a>
              );
            })}
            <Button
              asChild
              className="mt-2 bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
            >
              <a href="#contact" onClick={() => setOpen(false)}>
                अर्ज करा
              </a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="hero-gradient relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute right-10 top-40 h-96 w-96 rounded-full bg-[#0b1f4d]/20 blur-3xl" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-24">
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#2563eb] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> डिजिटल इंडिया · ग्रामीण फ्रँचायझी संधी
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#0b1f4d] sm:text-5xl lg:text-6xl">
            स्वतःचे{" "}
            <span className="bg-gradient-to-r from-[#2563eb] to-[#0b1f4d] bg-clip-text text-transparent">
              OMSUN E सेवा केंद्र
            </span>{" "}
            सुरू करा
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg">
            आपल्या गावामध्ये बँकिंग सेवा, CSC सेंटर, सेतू केंद्र, आपले सरकार
            केंद्र, शेतकरी सेवा, विद्यार्थी मदत, टॅक्स फाइलिंग, सरकारी योजना,
            RTO व तहसील सेवा उपलब्ध करून द्या.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-[#2563eb] text-white shadow-lg shadow-blue-500/40 hover:bg-[#1d4ed8]">
              <a href="#contact">अर्ज करा <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#0b1f4d] text-[#0b1f4d] hover:bg-[#0b1f4d] hover:text-white">
              <a href="#franchise">रिटेलर बना</a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-700">
            {["100% सुरक्षित", "RBI/CSC अनुरूप", "Lifetime सपोर्ट"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#2563eb]" /> {t}
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-white/60 shadow-2xl">
            <img src={hero} alt="ग्रामीण डिजिटल सेवा केंद्र" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0b1f4d]/40 via-transparent to-transparent" />
          </div>
          <div className="glass animate-float absolute -left-4 bottom-8 hidden rounded-2xl p-4 shadow-xl sm:block">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#2563eb] p-2 text-white"><Banknote className="h-5 w-5" /></div>
              <div>
                <div className="text-xs text-slate-600">आजचे उत्पन्न</div>
                <div className="text-lg font-bold text-[#0b1f4d]">₹ 4,250</div>
              </div>
            </div>
          </div>
          <div className="glass animate-float absolute -right-4 top-8 hidden rounded-2xl p-4 shadow-xl sm:block" style={{ animationDelay: "1s" }}>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#0b1f4d] p-2 text-white"><Users className="h-5 w-5" /></div>
              <div>
                <div className="text-xs text-slate-600">ग्राहक</div>
                <div className="text-lg font-bold text-[#0b1f4d]">12,500+</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const dur = 1600;
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setN(Math.floor(end * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [end]);
  return (
    <span ref={ref}>
      {n.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

function About() {
  return (
    <section id="about" className="dark-gradient relative py-20 text-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-300">
            आमच्याबद्दल
          </div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            OMSUN E सेवा केंद्र बद्दल
          </h2>
          <p className="mt-5 text-base leading-relaxed text-blue-100">
            OMSUN E सेवा केंद्र हे ग्रामीण भागातील डिजिटल सेवा नेटवर्क आहे, जे
            रिटेलर्स आणि प्रमोटर्सना बँकिंग, सरकारी आणि डिजिटल सेवांद्वारे
            उत्पन्नाची संधी उपलब्ध करून देते.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="glass-dark rounded-2xl p-7">
            <div className="mb-3 inline-flex rounded-xl bg-[#2563eb] p-3">
              <Award className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold">आमचे ध्येय (Mission)</h3>
            <p className="mt-2 text-sm text-blue-100">
              प्रत्येक गावात विश्वासार्ह डिजिटल सेवा पोहोचवणे आणि स्थानिक
              तरुणांना उद्योजक बनवणे.
            </p>
          </div>
          <div className="glass-dark rounded-2xl p-7">
            <div className="mb-3 inline-flex rounded-xl bg-[#2563eb] p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold">आमची दृष्टी (Vision)</h3>
            <p className="mt-2 text-sm text-blue-100">
              महाराष्ट्रातील प्रत्येक गावापर्यंत डिजिटल भारताची सेवा पोहोचवून
              ग्रामीण अर्थव्यवस्था बळकट करणे.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 rounded-2xl bg-white/5 p-6 backdrop-blur md:grid-cols-4">
          {[
            { n: 2500, s: "+", l: "सक्रिय रिटेलर्स" },
            { n: 4800, s: "+", l: "जोडलेली गावे" },
            { n: 1250000, s: "+", l: "पूर्ण झालेल्या सेवा" },
            { n: 980000, s: "+", l: "समाधानी ग्राहक" },
          ].map((c) => (
            <div key={c.l} className="rounded-xl bg-white p-5 text-center text-[#0b1f4d] shadow-lg">
              <div className="text-2xl font-extrabold text-[#2563eb] sm:text-3xl">
                <Counter end={c.n} suffix={c.s} />
              </div>
              <div className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{c.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const services = [
  { icon: Wallet, t: "AEPS पैसे काढणे" },
  { icon: Banknote, t: "पैसे जमा सेवा" },
  { icon: Smartphone, t: "मोबाईल रिचार्ज" },
  { icon: Tv, t: "DTH रिचार्ज" },
  { icon: Zap, t: "वीज बिल भरणा" },
  { icon: Shield, t: "विमा सेवा" },
  { icon: CreditCard, t: "PAN कार्ड सेवा" },
  { icon: FileText, t: "ऑनलाइन फॉर्म भरणे" },
  { icon: Landmark, t: "बँक खाते उघडणे" },
  { icon: Building2, t: "CSC संबंधित सेवा" },
  { icon: ScrollText, t: "सरकारी योजना सेवा" },
  { icon: Car, t: "RTO सेवा" },
  { icon: Receipt, t: "तहसील सेवा" },
  { icon: Tractor, t: "शेतकरी सेवा" },
  { icon: GraduationCap, t: "विद्यार्थी मदत सेवा" },
];

function Services() {
  return (
    <section id="services" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2563eb]">
            आमच्या सेवा
          </div>
          <h2 className="text-3xl font-extrabold text-[#0b1f4d] sm:text-4xl">
            एकाच ठिकाणी सर्व डिजिटल सेवा
          </h2>
          <p className="mt-3 text-slate-600">
            प्रीमियम फिनटेक प्लॅटफॉर्मद्वारे विश्वासार्ह, जलद आणि सुरक्षित सेवा.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {services.map((s) => (
            <div
              key={s.t}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[#2563eb] hover:shadow-xl hover:shadow-blue-500/20"
            >
              <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-3 text-[#2563eb] transition-colors group-hover:bg-[#2563eb] group-hover:text-white">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-[#0b1f4d]">{s.t}</div>
              <div className="pointer-events-none absolute inset-0 -z-0 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-200/40 blur-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Franchise() {
  const highlights = [
    { i: Wallet, t: "कमी गुंतवणूक", d: "फक्त छोट्या भांडवलात सुरूवात करा." },
    { i: GraduationCap, t: "पूर्ण प्रशिक्षण व सपोर्ट", d: "3 दिवसांचे प्रॅक्टिकल ट्रेनिंग." },
    { i: TrendingUp, t: "रोजच्या उत्पन्नाची संधी", d: "प्रत्येक सेवेवर कमिशन." },
    { i: Network, t: "विश्वासार्ह ग्रामीण नेटवर्क", d: "महाराष्ट्रभर पसरलेले." },
    { i: Headphones, t: "समर्पित ऑपरेशन टीम", d: "24x7 तांत्रिक मदत." },
  ];
  return (
    <section id="franchise" className="dark-gradient relative overflow-hidden py-20 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-300">
              फ्रँचायझी संधी
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              OMSUN E सेवा केंद्र फ्रँचायझी संधी
            </h2>
            <p className="mt-4 text-blue-100">
              आपल्या गावात स्वतःचा डिजिटल बिझनेस सुरू करण्याची सुवर्ण संधी.
              कमी गुंतवणुकीत मोठा परतावा.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {highlights.map((h) => (
                <div key={h.t} className="glass-dark rounded-xl p-4">
                  <div className="mb-2 inline-flex rounded-lg bg-[#2563eb] p-2">
                    <h.i className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-bold">{h.t}</div>
                  <div className="text-xs text-blue-100">{h.d}</div>
                </div>
              ))}
            </div>
            <Button asChild size="lg" className="mt-8 bg-[#2563eb] text-white shadow-xl shadow-blue-500/40 hover:bg-[#1d4ed8]">
              <a href="#contact">फ्रँचायझी बुक करा <ArrowRight className="ml-2 h-4 w-4" /></a>
            </Button>
          </div>

          <div className="grid gap-4">
            <div className="glass-dark rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-blue-200">मासिक उत्पन्न अंदाज</div>
                <TrendingUp className="h-5 w-5 text-blue-300" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { l: "महिना 1", v: "₹15K" },
                  { l: "महिना 3", v: "₹30K" },
                  { l: "महिना 6+", v: "₹60K+" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-white/10 p-4">
                    <div className="text-2xl font-extrabold text-white">{s.v}</div>
                    <div className="text-xs text-blue-200">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex h-32 items-end gap-2">
                {[30, 45, 55, 65, 78, 88, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-[#2563eb] to-blue-300" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-blue-200">
                {["जा", "फे", "मा", "ए", "मे", "जू", "जु"].map((m) => <span key={m}>{m}</span>)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "ROI", v: "3-4 म." },
                { l: "ब्रेक-ईव्हन", v: "60 दिवस" },
                { l: "रेटिंग", v: "4.9★" },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-white p-4 text-center text-[#0b1f4d] shadow-lg">
                  <div className="text-xl font-extrabold text-[#2563eb]">{x.v}</div>
                  <div className="text-xs text-slate-600">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const items = [
    { i: MapPin, t: "प्रत्येक गावात फक्त 1 रिटेलर" },
    { i: GraduationCap, t: "3 दिवसांचे प्रॅक्टिकल प्रशिक्षण" },
    { i: Users, t: "विशेष बिझनेस डेव्हलपमेंट ऑफिसर" },
    { i: Store, t: "Ready-to-Start Setup व ब्रँडिंग सपोर्ट" },
    { i: Headphones, t: "Lifetime Sales & Marketing Support" },
    { i: Network, t: "विश्वासार्ह डिजिटल सेवा नेटवर्क" },
    { i: TrendingUp, t: "अनेक उत्पन्नाचे स्रोत" },
    { i: MessageCircle, t: "जलद ग्राहक सपोर्ट" },
    { i: Lock, t: "सुरक्षित डिजिटल प्लॅटफॉर्म" },
    { i: Sparkles, t: "ग्रामीण बाजारपेठ वाढीची संधी" },
  ];
  return (
    <section className="dark-gradient relative py-20 text-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-300">
            OMSUN&nbsp;का निवडावे ?
          </div>
          <h2 className="text-3xl font-extrabold sm:text-4xl whitespace-pre-line">
            OMSUN&nbsp;का निवडावे ?{"\n"}
          </h2>
          <p className="mt-3 text-blue-100">प्रीमियम फिनटेक अनुभव, विश्वासार्ह ब्रँड.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <div key={x.t} className="glass-dark group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:bg-white/10">
              <div className="mb-3 inline-flex rounded-xl border-2 border-blue-300 p-3 text-blue-200 transition-colors group-hover:bg-[#2563eb] group-hover:text-white">
                <x.i className="h-6 w-6" />
              </div>
              <div className="font-semibold">{x.t}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { t: "फ्रँचायझी फॉर्म भरा", d: "ऑनलाइन सोपा फॉर्म." },
    { t: "व्हेरिफिकेशन कॉल", d: "आमची टीम तुमच्याशी बोलेल." },
    { t: "डॉक्युमेंट पडताळणी", d: "केवायसी व कागदपत्र तपासणी." },
    { t: "ऑनबोर्डिंग व प्रशिक्षण", d: "3 दिवसांचे प्रॅक्टिकल ट्रेनिंग." },
    { t: "OMSUN केंद्र सुरू करा", d: "आजच कमाई सुरू करा." },
  ];
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2563eb]">
            प्रक्रिया
          </div>
          <h2 className="text-3xl font-extrabold text-[#0b1f4d] sm:text-4xl">कसे काम करते?</h2>
        </div>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2563eb] to-[#0b1f4d] md:left-1/2 md:-translate-x-1/2" />
          <div className="space-y-8">
            {steps.map((s, i) => (
              <div key={s.t} className={`relative flex flex-col md:flex-row ${i % 2 ? "md:flex-row-reverse" : ""} items-start gap-4 md:items-center`}>
                <div className="absolute left-6 z-10 -translate-x-1/2 md:left-1/2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563eb] text-lg font-bold text-white shadow-lg shadow-blue-500/40 ring-4 ring-white">
                    {i + 1}
                  </div>
                </div>
                <div className="ml-16 w-full md:ml-0 md:w-1/2 md:px-8">
                  <Card className="border-blue-100 shadow-md transition-shadow hover:shadow-xl">
                    <CardContent className="p-5">
                      <div className="text-base font-bold text-[#0b1f4d]">{s.t}</div>
                      <div className="mt-1 text-sm text-slate-600">{s.d}</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="hidden md:block md:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const list = [
    { n: "रमेश पाटील", v: "सातारा, वाई", s: "OMSUN मुळे माझ्या गावात मीच डिजिटल सेवा देतो. महिन्याला ₹40,000 कमवतो." },
    { n: "सुनिता जाधव", v: "नाशिक, सिन्नर", s: "महिला उद्योजक म्हणून मला पूर्ण सपोर्ट मिळाला. ट्रेनिंग खूप उपयुक्त होते." },
    { n: "अमोल देशमुख", v: "अहमदनगर", s: "AEPS व बँकिंग सेवांमुळे ग्राहक रोज येतात. विश्वासार्ह कंपनी आहे." },
  ];
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2563eb]">
            ग्राहक अनुभव
          </div>
          <h2 className="text-3xl font-extrabold text-[#0b1f4d] sm:text-4xl">यशोगाथा</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {list.map((t) => (
            <div key={t.n} className="glass relative rounded-2xl border border-white p-6 shadow-xl shadow-blue-500/10">
              <Quote className="absolute right-5 top-5 h-8 w-8 text-blue-200" />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#0b1f4d] text-lg font-bold text-white">
                  {t.n[0]}
                </div>
                <div>
                  <div className="font-bold text-[#0b1f4d]">{t.n}</div>
                  <div className="text-xs text-slate-600">{t.v}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5 text-[#2563eb]">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{t.s}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Steps a customer sees for a service request (OMSUN request statuses grouped).
const STATUS_FLOW = [
  { k: "submitted", l: "अर्ज मिळाला" },
  { k: "documents", l: "कागदपत्रे" },
  { k: "processing", l: "प्रक्रिया सुरू" },
  { k: "completed", l: "पूर्ण झाले" },
];
const STEP_OF: Record<string, number> = {
  new: 0, assigned: 0, documents_required: 1, documents_received: 1, under_process: 2, pending: 2, completed: 3,
};
const STATUS_NOTE: Record<string, string> = {
  new: "तुमचा अर्ज मिळाला आहे.",
  assigned: "तुमचा अर्ज आमच्या टीमकडे दिला आहे.",
  documents_required: "कागदपत्रे हवी आहेत. कृपया केंद्राशी संपर्क करा.",
  documents_received: "कागदपत्रे मिळाली, तपासणी सुरू आहे.",
  under_process: "तुमच्या अर्जावर काम सुरू आहे.",
  pending: "अर्ज सरकारी कार्यालयात प्रलंबित आहे.",
  completed: "तुमचे काम पूर्ण झाले आहे.",
  rejected: "अर्ज नाकारला गेला. कृपया केंद्राशी संपर्क करा.",
  cancelled: "अर्ज रद्द झाला आहे.",
};
const dateMr = (v: string) => new Date(v).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });

function StatusTracker() {
  const [number, setNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extract<TrackResult, { ok: true }> | null>(null);
  const onCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await trackRequest(number, mobile);
      if (r.ok) setResult(r);
      else {
        setResult(null);
        toast.error(r.message);
      }
    } catch {
      toast.error("स्थिती तपासता आली नाही. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setBusy(false);
    }
  };
  const stepIdx = result ? STEP_OF[result.status] ?? -1 : -1;
  const stopped = result && (result.status === "rejected" || result.status === "cancelled");
  return (
    <section id="status" className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2563eb]">
            ट्रॅकिंग
          </div>
          <h2 className="text-3xl font-extrabold text-[#0b1f4d] sm:text-4xl">अर्जाची स्थिती तपासा</h2>
          <p className="mt-3 text-slate-600">पावतीवरील अर्ज क्रमांक आणि अर्ज करताना दिलेला मोबाईल नंबर टाका.</p>
        </div>
        <Card className="border-blue-100 shadow-xl">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={onCheck} className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="अर्ज क्रमांक (उदा. OMS-2610-000123)"
                  aria-label="अर्ज क्रमांक"
                  className="h-12 pl-10"
                />
              </div>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                type="tel"
                inputMode="numeric"
                maxLength={14}
                placeholder="मोबाईल नंबर"
                aria-label="मोबाईल नंबर"
                className="h-12 md:w-48"
              />
              <Button type="submit" disabled={busy} className="h-12 bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]">
                {busy ? "तपासत आहे…" : "ट्रॅक करा"}
              </Button>
            </form>
            {result && (
              <div className="animate-fade-up mt-8">
                <div className="mb-6 grid gap-1 rounded-xl bg-blue-50 p-4 text-sm sm:grid-cols-2">
                  <div><span className="font-semibold text-[#0b1f4d]">अर्ज क्रमांक:</span> <span className="text-[#2563eb]">{result.requestNumber}</span></div>
                  <div><span className="font-semibold text-[#0b1f4d]">सेवा:</span> {result.serviceMr || result.serviceEn}</div>
                  <div><span className="font-semibold text-[#0b1f4d]">अर्ज दिनांक:</span> {dateMr(result.submittedAt)}</div>
                  <div><span className="font-semibold text-[#0b1f4d]">शेवटचा बदल:</span> {dateMr(result.updatedAt)}</div>
                  <div className={`sm:col-span-2 font-semibold ${stopped ? "text-red-600" : "text-[#0b1f4d]"}`}>{STATUS_NOTE[result.status] ?? result.status}</div>
                </div>
                {!stopped && (
                  <div className="relative">
                    {/* Vertical line (mobile) */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 md:hidden" />
                    <div
                      className="absolute left-4 top-0 w-0.5 bg-[#2563eb] transition-all md:hidden"
                      style={{ height: `${(Math.max(stepIdx, 0) / (STATUS_FLOW.length - 1)) * 100}%` }}
                    />
                    {/* Horizontal line (desktop) */}
                    <div className="absolute left-0 right-0 top-5 hidden h-0.5 bg-slate-200 md:block" />
                    <div
                      className="absolute left-0 top-5 hidden h-0.5 bg-[#2563eb] transition-all md:block"
                      style={{ width: `${(Math.max(stepIdx, 0) / (STATUS_FLOW.length - 1)) * 100}%` }}
                    />
                    <div className="relative grid gap-6 md:grid-cols-4">
                      {STATUS_FLOW.map((s, i) => {
                        const done = i <= stepIdx;
                        return (
                          <div key={s.k} className="flex items-center gap-3 md:flex-col md:text-center">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-slate-300 bg-white text-slate-400"} relative z-10`}>
                              {done ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                            </div>
                            <div className={`text-sm font-semibold ${done ? "text-[#0b1f4d]" : "text-slate-400"}`}>
                              {s.l}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EmployeeLogin() {
  return (
    <section id="login" className="dark-gradient py-20 text-white">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-300">
              कर्मचारी पोर्टल
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">कर्मचारी लॉगिन</h2>
            <p className="mt-4 text-blue-100">
              सुरक्षित डॅशबोर्डद्वारे लीड, अर्ज व ग्राहक व्यवस्थापन.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { i: Users, t: "Lead Management" },
                { i: FileText, t: "Retailer Applications" },
                { i: Network, t: "Operations Panel" },
                { i: Wallet, t: "Commission Tracking" },
                { i: Headphones, t: "Customer Support" },
                { i: Shield, t: "Secure Access" },
              ].map((m) => (
                <div key={m.t} className="glass-dark flex items-center gap-3 rounded-xl p-3">
                  <div className="rounded-lg bg-[#2563eb] p-2"><m.i className="h-4 w-4" /></div>
                  <div className="text-sm font-semibold">{m.t}</div>
                </div>
              ))}
            </div>
          </div>
          <Card className="border-0 bg-[#0b1f4d] shadow-2xl">
            <CardContent className="p-8">
              <div className="mb-6 flex items-center gap-2 text-white">
                <Lock className="h-5 w-5 text-blue-300" />
                <span className="font-bold">सुरक्षित लॉगिन</span>
              </div>
              <p className="mb-6 text-sm text-blue-100">
                कर्मचारी / मालक / अकाउंटंटसाठी अंतर्गत पोर्टलवर प्रवेश करा.
              </p>
              <Button asChild size="lg" className="h-12 w-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                <a href={STAFF_LOGIN_URL}>
                  <LogIn className="mr-2 h-4 w-4" /> लॉगिन पेजवर जा
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "किती गुंतवणूक आवश्यक आहे?", a: "सुरुवातीला फक्त ₹15,000 - ₹25,000 गुंतवणुकीत OMSUN E सेवा केंद्र सुरू करता येते. यात बायोमेट्रिक डिव्हाइस, ब्रँडिंग व ट्रेनिंग समाविष्ट आहे." },
    { q: "दुकान आवश्यक आहे का?", a: "होय, छोटी जागा किंवा घरातील एक खोलीही पुरेशी आहे. किमान 80-100 sq.ft. जागा शिफारस केली जाते." },
    { q: "किती कमाई होऊ शकते?", a: "अनुभवी रिटेलर्स महिन्याला ₹30,000 ते ₹80,000 कमाई करतात. कमाई गाव, ग्राहकसंख्या व सेवांवर अवलंबून आहे." },
    { q: "प्रशिक्षण दिले जाते का?", a: "होय, 3 दिवसांचे संपूर्ण प्रॅक्टिकल प्रशिक्षण आमच्या टीमकडून मोफत दिले जाते." },
    { q: "कोणती कागदपत्रे लागतात?", a: "आधार कार्ड, PAN कार्ड, पासपोर्ट साइज फोटो, बँक पासबुक, पत्ता पुरावा व दुकानाचे फोटो." },
    { q: "ऑनबोर्डिंगला किती वेळ लागतो?", a: "सरासरी 7-10 दिवसांत संपूर्ण ऑनबोर्डिंग प्रक्रिया पूर्ण होते." },
    { q: "कंपनीकडून मार्केटिंग सपोर्ट मिळेल का?", a: "होय. बॅनर, स्टँडी, सोशल मीडिया क्रिएटिव्ह आणि स्थानिक प्रचार साहित्य कंपनी पुरवते." },
    { q: "प्रत्येक गावात किती रिटेलर घेतले जातात?", a: "प्रत्येक गावात फक्त 1 रिटेलर निवडला जातो, जेणेकरून पूर्ण मार्केट तुमच्याकडे राहील." },
    { q: "Lifetime Support मिळतो का?", a: "होय. विक्री, तांत्रिक व मार्केटिंग सपोर्ट आयुष्यभर मोफत दिला जातो." },
  ];
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2563eb]">FAQ</div>
          <h2 className="text-3xl font-extrabold text-[#0b1f4d] sm:text-4xl">वारंवार विचारले जाणारे प्रश्न</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-blue-100 bg-blue-50/30 px-5 transition-colors hover:border-[#2563eb]">
              <AccordionTrigger className="text-left text-base font-semibold text-[#0b1f4d] hover:text-[#2563eb] hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-700">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Contact() {
  const [sending, setSending] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true);
    try {
      const result = await submitEnquiry(new FormData(form));
      if (result.ok) {
        toast.success("तुमचा अर्ज मिळाला! आम्ही लवकरच कॉल करू.");
        form.reset();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("अर्ज पाठवता आला नाही. कृपया पुन्हा प्रयत्न करा किंवा आम्हाला कॉल करा.");
    } finally {
      setSending(false);
    }
  };
  return (
    <section id="contact" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2563eb]">संपर्क</div>
          <h2 className="text-3xl font-extrabold text-[#0b1f4d] sm:text-4xl">कॉलबॅक मिळवा</h2>
          <p className="mt-3 text-slate-600">फॉर्म भरा, आमची टीम 24 तासांत तुम्हाला संपर्क करेल.</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-5">
          <Card className="border-blue-100 shadow-xl lg:col-span-3">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>पूर्ण नाव *</Label>
                  <Input required name="full_name" maxLength={100} autoComplete="name" className="mt-1.5 h-11" placeholder="तुमचे पूर्ण नाव" />
                </div>
                <div>
                  <Label>मोबाईल नंबर *</Label>
                  <Input required name="mobile" type="tel" inputMode="numeric" maxLength={14} autoComplete="tel" className="mt-1.5 h-11" placeholder="98XXXXXXXX" />
                </div>
                <div>
                  <Label>गाव *</Label>
                  <Input required name="village" maxLength={100} className="mt-1.5 h-11" placeholder="गावाचे नाव" />
                </div>
                <div>
                  <Label>जिल्हा *</Label>
                  <Input required name="district" maxLength={100} className="mt-1.5 h-11" placeholder="जिल्हा" />
                </div>
                <div className="sm:col-span-2">
                  <Label>सध्याचा व्यवसाय</Label>
                  <Input name="business_type" maxLength={200} className="mt-1.5 h-11" placeholder="उदा. शेती, दुकान, नोकरी" />
                </div>
                <div className="sm:col-span-2">
                  <Label>इच्छुक सेवा</Label>
                  <Textarea name="interest" maxLength={1000} className="mt-1.5" placeholder="कोणत्या सेवांमध्ये रस आहे?" rows={3} />
                </div>
                <div className="sm:col-span-2">
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                  <Button type="submit" size="lg" disabled={sending} className="w-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                    {sending ? "पाठवत आहे…" : "कॉलबॅक मिळवा"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card className="border-blue-100">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-[#2563eb]"><Phone className="h-5 w-5" /></div>
                  <div>
                    <div className="text-xs text-slate-500">फोन</div>
                    <a href="tel:+919146997733" className="font-bold text-[#0b1f4d] hover:text-[#2563eb]">+91 9146997733</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-[#2563eb]"><Mail className="h-5 w-5" /></div>
                  <div>
                    <div className="text-xs text-slate-500">ईमेल</div>
                    <a href="mailto:info@omsun.in" className="font-bold text-[#0b1f4d] hover:text-[#2563eb]">info@omsun.in</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-[#2563eb]"><MapPin className="h-5 w-5" /></div>
                  <div>
                    <div className="text-xs text-slate-500">कार्यालय</div>
                    <div className="font-bold text-[#0b1f4d]">614 , Durgasadan APT 3rd-Floor , Near Ganjpeth, Police Station, Guruwar Peth ,Pune - 411042&nbsp;</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button asChild className="flex-1 bg-[#25D366] text-white hover:bg-[#1ebe57]">
                    <a href="https://wa.me/919146997733" target="_blank" rel="noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb] hover:text-white">
                    <a href="tel:+919146997733"><Phone className="mr-2 h-4 w-4" /> कॉल</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-blue-100">
              <div className="relative h-48 w-full bg-blue-50">
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <MapPin className="mx-auto h-10 w-10 text-[#2563eb]" />
                    <div className="mt-2 text-sm font-semibold text-[#0b1f4d]">Google Maps</div>
                    <div className="text-xs text-slate-500">कार्यालय स्थान</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0b1f4d] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img src={logo} alt="logo" className="h-10 w-10 rounded bg-white p-1" />
              <div>
                <div className="font-bold">OMSUN</div>
                <div className="text-xs text-blue-300">E सेवा केंद्र</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-blue-100">
              ग्रामीण भारतासाठी विश्वासार्ह डिजिटल सेवा फ्रँचायझी नेटवर्क.
            </p>
            <div className="mt-4 flex gap-2">
              {[Facebook, Instagram, Youtube, Twitter].map((I, i) => (
                <a key={i} href="#" className="rounded-lg bg-white/10 p-2 transition-colors hover:bg-[#2563eb]">
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 font-bold">Quick Links</div>
            <ul className="space-y-2 text-sm text-blue-100">
              {nav.map((n) => (
                <li key={n.href}><a href={n.href} className="transition-colors hover:text-[#2563eb]">{n.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-4 font-bold">सेवा</div>
            <ul className="space-y-2 text-sm text-blue-100">
              {["AEPS", "बँकिंग", "CSC सेवा", "RTO सेवा", "तहसील सेवा", "विमा"].map((s) => (
                <li key={s}><a href="#services" className="transition-colors hover:text-[#2563eb]">{s}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-4 font-bold">संपर्क</div>
            <ul className="space-y-2 text-sm text-blue-100">
              <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-[#2563eb]" /> +91 9146997733</li>
              <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-[#2563eb]" /> info@omsun.in</li>
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 text-[#2563eb] w-[20px] h-[20px]" /> 614 , Durgasadan APT 3rd-Floor , Near Ganjpeth Police Station, Guruwar Peth ,Pune - 411042&nbsp;</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-blue-200 md:flex-row">
          <div>© {new Date().getFullYear()} OMSUN E सेवा केंद्र. सर्व हक्क राखीव.</div>
          <div className="flex gap-5">
            <a href="#" className="transition-colors hover:text-[#2563eb]">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-[#2563eb]">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FloatingWhatsApp() {
  return (
    <a
      href="https://wa.me/919146997733"
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp Support"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl shadow-green-500/40 transition-transform hover:scale-110"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" />
      <img src={whatsappIcon} alt="WhatsApp" className="relative h-14 w-14" />
    </a>
  );
}

export default function Home() {
  return (
    <div lang="mr" className="site min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <Franchise />
        <WhyUs />
        <HowItWorks />
        <Testimonials />
        <StatusTracker />
        <EmployeeLogin />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <Toaster richColors position="top-center" />
    </div>
  );
}
