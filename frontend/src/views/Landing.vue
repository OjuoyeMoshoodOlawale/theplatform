<template>
  <div class="min-h-screen font-body">

    <!-- ── STICKY NAV ─────────────────────────────────────── -->
    <nav class="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      :class="scrolled ? 'bg-brand-green shadow-lg' : 'bg-gradient-to-b from-black/40 to-transparent'">
      <div class="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <button @click="scrollTo('top')">
          <img :src="orgLogo" :alt="orgName" class="h-9" />
        </button>
        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-6 text-white/80 text-sm font-semibold">
          <template v-for="l in visibleNavLinks" :key="l.id">
            <RouterLink v-if="l.type==='route'" :to="l.id"
              class="hover:text-brand-gold transition-colors flex items-center gap-1.5">
              <ShoppingBag v-if="l.icon==='ShoppingBag'" :size="13" />
              {{ l.label }}
            </RouterLink>
            <button v-else class="hover:text-brand-gold transition-colors" @click="scrollTo(l.id)">
              {{ l.label }}
            </button>
          </template>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="eventStore.isRegistrationOpen"
            class="btn-gold text-xs py-2 px-4 hidden sm:inline-flex items-center gap-1.5"
            @click="scrollTo('tickets')">
            <Ticket :size="13" /> Register for Ticket
          </button>
          <!-- Mobile menu -->
          <button class="md:hidden text-white p-1" @click="mobileMenuOpen = !mobileMenuOpen">
            <component :is="mobileMenuOpen ? X : Menu" :size="22" />
          </button>
          <a href="/admin/login" class="text-white/40 hover:text-white/80 transition-colors">
            <Lock :size="15" />
          </a>
        </div>
      </div>
      <!-- Mobile dropdown -->
      <Transition name="slide-down-nav">
        <div v-if="mobileMenuOpen" class="md:hidden bg-brand-green/98 border-t border-white/10 py-3 px-6 space-y-1">
          <template v-for="l in visibleNavLinks" :key="l.id">
            <RouterLink v-if="l.type==='route'" :to="l.id"
              class="flex items-center gap-2 py-2.5 text-white/80 hover:text-brand-gold transition-colors text-sm font-semibold"
              @click="mobileMenuOpen=false">
              <ShoppingBag v-if="l.icon==='ShoppingBag'" :size="14" />
              {{ l.label }}
            </RouterLink>
            <button v-else
              class="block w-full text-left py-2.5 text-white/80 hover:text-brand-gold transition-colors text-sm font-semibold"
              @click="scrollTo(l.id); mobileMenuOpen=false">{{ l.label }}</button>
          </template>
          <button v-if="eventStore.isRegistrationOpen"
            class="mt-2 w-full btn-gold text-xs py-3 justify-center"
            @click="scrollTo('tickets'); mobileMenuOpen=false">
            <Ticket :size="13" /> Register for Ticket
          </button>
        </div>
      </Transition>
    </nav>

    <!-- ── HERO ───────────────────────────────────────────── -->
    <section class="relative min-h-screen bg-brand-green geometric-bg flex flex-col
                    items-center justify-center text-white overflow-hidden px-4">
      <!-- Blobs -->
      <div class="absolute top-0 right-0 w-96 h-96 md:w-[500px] md:h-[500px] rounded-full
                  bg-brand-gold/5 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-72 h-72 rounded-full
                  bg-brand-lightgreen/5 blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

      <!-- Gold beam sweep -->
      <div class="beam-sweep pointer-events-none absolute inset-0 overflow-hidden"></div>

      <div class="relative text-center max-w-5xl mx-auto pt-20 space-y-5">
        <!-- Logo -->
        <div class="float-anim inline-block"
          :class="heroStep>=1?'opacity-100 translate-y-0':'opacity-0 -translate-y-8'"
          style="transition:all 0.7s cubic-bezier(0.16,1,0.3,1)">
          <img :src="orgLogo" :alt="orgName" class="h-20 md:h-32 mx-auto drop-shadow-2xl" />
        </div>

        <!-- Active event badge -->
        <div v-if="eventStore.hasActiveEvent"
          :class="heroStep>=2?'opacity-100 scale-100':'opacity-0 scale-90'"
          style="transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1)" class="flex justify-center">
          <div class="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em]"
            :class="eventStore.isPastEvent
              ? 'bg-gray-500/15 border border-gray-400/40 text-gray-300'
              : 'bg-brand-gold/15 border border-brand-gold/40 text-brand-gold'">
            <span class="w-2 h-2 rounded-full" :class="eventStore.isPastEvent ? 'bg-gray-400' : 'bg-brand-gold pulse-glow'"></span>
            {{ eventStore.activeEvent.edition }} · {{ eventStore.isPastEvent ? 'Event Closed' : 'Registration Open' }}
          </div>
        </div>

        <!-- Title -->
        <h1 class="font-display font-bold text-3xl md:text-6xl lg:text-7xl leading-[1.05]"
          :class="heroStep>=3?'opacity-100 translate-y-0':'opacity-0 translate-y-8'"
          style="transition:all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s">
          <span class="bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            {{ eventStore.hasActiveEvent ? eventStore.activeEvent.title : orgName }}
          </span>
        </h1>

        <!-- Tagline -->
        <p class="text-white/65 text-base md:text-xl max-w-2xl mx-auto leading-relaxed"
          :class="heroStep>=4?'opacity-100 translate-y-0':'opacity-0 translate-y-6'"
          style="transition:all 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s">
          {{ eventStore.hasActiveEvent
            ? (eventStore.activeEvent.tagline || 'Reforming hearts. Building leaders. Connecting futures.')
            : 'Reforming hearts. Building leaders. Connecting futures.' }}
        </p>

        <!-- Event meta -->
        <div v-if="eventStore.hasActiveEvent"
          :class="heroStep>=4?'opacity-100':'opacity-0'"
          style="transition:opacity 0.5s ease 0.2s"
          class="flex items-center justify-center gap-4 md:gap-6 flex-wrap text-sm text-white/50">
          <span class="flex items-center gap-2">
            <CalendarDays :size="14" class="text-brand-gold" />
            {{ formatDateRange(eventStore.activeEvent.start_date, eventStore.activeEvent.end_date) }}
          </span>
          <span v-if="eventStore.activeEvent.venue" class="flex items-center gap-2">
            <MapPin :size="14" class="text-brand-gold" />
            {{ eventStore.activeEvent.venue }}
          </span>
        </div>

        <!-- Countdown -->
        <div v-if="eventStore.isRegistrationOpen"
          :class="heroStep>=5?'opacity-100 translate-y-0':'opacity-0 translate-y-4'"
          style="transition:all 0.6s ease 0.2s">
          <p class="text-white/30 text-xs uppercase tracking-[0.25em] mb-3">Event Countdown</p>
          <CountdownTimer :targetDate="formatDateForTimer(eventStore.activeEvent.start_date)" />
        </div>

        <!-- CTAs -->
        <div :class="heroStep>=6?'opacity-100 translate-y-0':'opacity-0 translate-y-4'"
          style="transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.25s">
          <div v-if="eventStore.hasActiveEvent"
            class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-2">
            <button class="btn-gold text-sm px-8 md:px-10 py-4 w-full sm:w-auto justify-center"
              @click="scrollTo('tickets')">
              <Ticket :size="18" /> Register for Ticket
            </button>
            <button class="btn-white text-sm px-8 md:px-10 py-4 w-full sm:w-auto justify-center"
              @click="scrollTo('schedule')">
              <LayoutList :size="18" /> View Programme
            </button>
          </div>
          <div v-else class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-2">
            <button class="btn-gold text-sm px-8 py-4 w-full sm:w-auto justify-center" @click="scrollTo('about')">
              <Sparkles :size="18" /> About the Summit
            </button>
            <button class="btn-white text-sm px-8 py-4 w-full sm:w-auto justify-center" @click="scrollTo('past-events')">
              <History :size="18" /> Past Editions
            </button>
          </div>
        </div>
      </div>

      <!-- Scroll cue -->
      <div class="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce"
        :class="heroStep>=6?'opacity-100':'opacity-0'" style="transition:opacity 0.5s ease 0.5s">
        <span class="text-white/20 text-xs uppercase tracking-[0.2em] hidden md:block">Scroll</span>
        <ChevronDown :size="20" class="text-white/30" />
      </div>
    </section>

    <!-- ── ABOUT ─────────────────────────────────────────── -->
    <section id="about" class="py-16 md:py-24 bg-brand-cream">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <div class="reveal-left">
            <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Sparkles :size="13" /> About the Summit
            </p>
            <h2 class="font-display font-bold text-3xl md:text-5xl text-brand-green mb-5 leading-tight">
              Empowering the<br />Muslim Youth
            </h2>
            <p class="text-gray-600 leading-relaxed mb-4">
              {{ eventStore.hasActiveEvent && eventStore.activeEvent.description
                ? eventStore.activeEvent.description.slice(0, 280) + (eventStore.activeEvent.description.length > 280 ? '…' : '')
                : 'The Muslim Youth Summit (MYS) is an annual programme dedicated to Islamic youth reformation, career development, and building meaningful connections among young Muslim professionals and students.'
              }}
            </p>
            <div class="grid grid-cols-3 gap-4 md:gap-6 mt-6">
              <div v-for="s in aboutStats" :key="s.label" class="text-center reveal" :class="s.delay">
                <p class="font-display font-bold text-2xl md:text-3xl text-brand-green">{{ s.value }}</p>
                <p class="text-xs text-gray-500 uppercase tracking-wider mt-1">{{ s.label }}</p>
              </div>
            </div>
          </div>
          <div class="relative reveal-right">
            <div class="absolute -top-4 -right-4 w-32 md:w-48 h-32 md:h-48 bg-brand-gold/15 -z-0"></div>
            <div class="relative bg-brand-green text-white p-6 md:p-8 z-10">
              <p class="font-display font-bold text-xl md:text-2xl mb-4 text-brand-gold flex items-center gap-2">
                <Target :size="20" /> Our Mission
              </p>
              <p class="text-white/80 leading-relaxed text-sm md:text-base">
                To nurture a generation of Muslim youth grounded in Islamic values, equipped with modern
                knowledge, and empowered to lead with excellence in all spheres of life.
              </p>
              <div class="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                <div v-for="p in pillars" :key="p.label" class="flex items-center gap-2">
                  <component :is="p.icon" :size="14" class="text-brand-gold flex-shrink-0" />
                  <span class="text-sm">{{ p.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── PROGRAMME (if active event has schedule) ────────── -->
    <section v-if="eventStore.hasActiveEvent && lectures.length" id="schedule" class="py-16 md:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="flex items-end justify-between mb-8 md:mb-12 reveal flex-wrap gap-4">
          <div>
            <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <LayoutList :size="13" /> Event Programme
            </p>
            <h2 class="font-display font-bold text-3xl md:text-4xl text-brand-green">Full Schedule</h2>
          </div>
          <button v-if="eventStore.isRegistrationOpen" class="btn-green text-xs" @click="scrollTo('tickets')">
            <Ticket :size="13" /> Register for Ticket
          </button>
          <div v-else-if="eventStore.isPastEvent && recordingsCount > 0"
            class="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 text-xs font-semibold">
            <Youtube :size="14" />
            {{ recordingsCount }} session recording{{ recordingsCount > 1 ? 's' : '' }} available — click the red buttons to watch
          </div>
        </div>
        <!-- Day tabs -->
        <div v-if="eventDays.length > 1" class="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button v-for="d in eventDays" :key="d.id"
            class="flex-shrink-0 px-4 py-2 text-sm font-semibold border-2 transition-all"
            :class="activeDay===d.id
              ? 'border-brand-green bg-brand-green text-white'
              : 'border-gray-200 text-gray-500 hover:border-brand-green hover:text-brand-green'"
            @click="activeDay=d.id">
            Day {{ d.day_number }}
            <span class="block text-xs opacity-70">{{ fmtShortDate(d.event_date) }}</span>
          </button>
        </div>
        <!-- Schedule table -->
        <div class="bg-white border border-gray-100 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-brand-green text-white">
              <tr>
                <th class="px-3 md:px-4 py-3 text-left text-xs font-bold uppercase tracking-wider w-10">S/N</th>
                <th class="px-3 md:px-4 py-3 text-left text-xs font-bold uppercase tracking-wider w-28">Time</th>
                <th class="px-3 md:px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Session</th>
                <th class="px-3 md:px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Lecturer</th>
                <th class="px-3 md:px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden lg:table-cell">Facilitator(s)</th>
                <th class="px-3 md:px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-16">Video</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in filteredLectures" :key="l.id"
                class="border-b border-gray-50 hover:bg-brand-cream/30"
                :class="l.lecture_type === 'prayer' || l.lecture_type === 'break' ? 'bg-brand-cream/40' : ''">
                <td class="px-3 md:px-4 py-3 font-mono font-bold text-brand-gold text-center text-xs">{{ l.s_n || i+1 }}</td>
                <td class="px-3 md:px-4 py-3 text-brand-green font-semibold text-xs whitespace-nowrap">
                  {{ l.start_time || '—' }}<span v-if="l.end_time" class="text-gray-400"> – {{ l.end_time }}</span>
                </td>
                <td class="px-3 md:px-4 py-3">
                  <p class="font-semibold text-gray-800">{{ l.title }}</p>
                  <p v-if="l.description" class="text-xs text-gray-400 mt-0.5 hidden md:block">{{ l.description }}</p>
                  <span class="text-xs px-1.5 py-0.5 rounded-sm mt-1 inline-block capitalize"
                    :class="typeClass(l.lecture_type)">{{ l.lecture_type }}</span>
                </td>
                <td class="px-3 md:px-4 py-3 text-gray-600 text-sm hidden md:table-cell">{{ l.main_speaker_name || '—' }}</td>
                <td class="px-3 md:px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{{ l.facilitators || '—' }}</td>
                <td class="px-3 md:px-4 py-3 text-center">
                  <a v-if="l.youtube_url" :href="l.youtube_url" target="_blank" rel="noopener"
                    class="inline-flex items-center justify-center w-8 h-8 bg-red-500 text-white hover:bg-red-600 transition-colors"
                    title="Watch Recording">
                    <Youtube :size="14" />
                  </a>
                  <span v-else class="text-gray-200 text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ── SPEAKERS ───────────────────────────────────────── -->
    <section v-if="eventStore.speakers.length" id="speakers" class="py-16 md:py-24 bg-brand-cream">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="text-center mb-10 md:mb-14 reveal">
          <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
            <Mic :size="13" /> Featured Speakers
          </p>
          <h2 class="font-display font-bold text-3xl md:text-4xl text-brand-green">Invited Scholars &amp; Experts</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <SpeakerCard v-for="(s, i) in eventStore.speakers" :key="s.id" :speaker="s"
            class="reveal" :class="`reveal-delay-${(i%4)+1}`" />
        </div>
      </div>
    </section>

    <!-- ── TICKETS ───────────────────────────────────────── -->
    <section v-if="eventStore.isRegistrationOpen" id="tickets"
      class="py-16 md:py-24 bg-brand-green geometric-bg relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-brand-green via-brand-green to-[#013a24]"></div>
      <div class="relative max-w-7xl mx-auto px-4 md:px-6">
        <div class="text-center mb-10 md:mb-14 reveal">
          <p class="text-white/40 font-bold text-xs uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
            <Ticket :size="13" /> Get Your Ticket
          </p>
          <h2 class="font-display font-bold text-3xl md:text-4xl text-white">Register for {{ eventStore.activeEvent?.edition }}</h2>
          <p v-if="eventStore.activeEvent?.venue" class="text-white/40 mt-2 flex items-center justify-center gap-2 text-sm">
            <MapPin :size="13" /> {{ eventStore.activeEvent.venue }}
          </p>
        </div>
        <div v-if="eventStore.ticketTypes.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          <TicketCard v-for="(tt, i) in eventStore.ticketTypes" :key="tt.id"
            :type="tt" :featured="i===0"
            :earlyBirdCloses="eventStore.activeEvent?.early_bird_closes_at"
            class="reveal" :class="`reveal-delay-${(i%3)+1}`"
            @select="selectTicket" />
        </div>
        <div v-else class="text-center">
          <RouterLink to="/register" class="btn-gold text-sm px-10 py-4">
            <Ticket :size="18" /> Register Now
          </RouterLink>
        </div>
        <p class="text-center text-white/25 text-xs mt-8 flex items-center justify-center gap-2">
          <ShieldCheck :size="13" /> Secure payments via Paystack
        </p>
      </div>
    </section>

    <!-- ── GALLERY ───────────────────────────────────────── -->
    <section v-if="gallery.length" id="gallery" class="py-16 md:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="text-center mb-10 reveal">
          <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
            <Images :size="13" /> Moments
          </p>
          <h2 class="font-display font-bold text-3xl md:text-4xl text-brand-green">Event Gallery</h2>
        </div>
        <GalleryMasonry :images="gallery" />
      </div>
    </section>

    <!-- ── PAST EVENTS ───────────────────────────────────── -->
    <section id="past-events" class="py-16 md:py-24 bg-brand-cream">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="flex items-end justify-between mb-8 md:mb-12 reveal flex-wrap gap-4">
          <div>
            <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <History :size="13" /> History
            </p>
            <h2 class="font-display font-bold text-3xl md:text-4xl text-brand-green">Past Editions</h2>
          </div>
          <RouterLink to="/past-events" class="btn-outline text-xs">
            View All <ArrowRight :size="13" />
          </RouterLink>
        </div>
        <div v-if="pastEvents.length" class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <RouterLink v-for="(evt, i) in pastEvents.slice(0,3)" :key="evt.id"
            :to="`/past-events#${evt.edition}`"
            class="bg-white border border-gray-100 hover:border-brand-gold transition-all
                   duration-300 overflow-hidden group reveal block" :class="`reveal-delay-${i+1}`">
            <div class="h-44 bg-brand-green/10 overflow-hidden relative">
              <img v-if="evt.cover_image_url || evt.gallery?.[0]?.image_url"
                :src="evt.cover_image_url || evt.gallery?.[0]?.image_url" :alt="evt.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-green/20 to-brand-green/5">
                <span class="font-display font-bold text-5xl text-brand-green/20">{{ evt.edition }}</span>
              </div>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-green/60 to-transparent p-4">
                <span class="badge-gold text-xs">{{ evt.edition }}</span>
              </div>
            </div>
            <div class="p-4 md:p-5">
              <h3 class="font-display font-bold text-brand-green text-base">{{ evt.title }}</h3>
              <p class="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <CalendarDays :size="12" />
                {{ formatDateRange(evt.start_date, evt.end_date) }}
              </p>
              <p v-if="evt.venue" class="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <MapPin :size="11" /> {{ evt.venue }}
              </p>
              <div class="flex items-center gap-2 mt-3 text-brand-green text-xs font-semibold">
                View details <ArrowRight :size="12" />
              </div>
            </div>
          </RouterLink>
        </div>
        <div v-else class="text-center py-12 text-gray-300">
          <p class="text-sm">Past event records will appear here after events are completed.</p>
        </div>
      </div>
    </section>


    <!-- ── SPONSORS ──────────────────────────────────────── -->
    <section v-if="sponsors.length" id="sponsors" class="py-12 md:py-16 bg-white border-t border-gray-100">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="text-center mb-8 reveal">
          <p class="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mb-2">Proudly Supported By</p>
          <h2 class="font-display font-bold text-2xl md:text-3xl text-brand-green">Our Sponsors</h2>
        </div>
        <!-- Group by tier -->
        <div v-for="tier in sponsorTiers" :key="tier.name" class="mb-8 last:mb-0">
          <p class="text-center text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">{{ tier.label }}</p>
          <div class="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            <a v-for="sp in tier.items" :key="sp.id"
              :href="sp.website_url || '#'" :target="sp.website_url ? '_blank' : '_self'"
              :title="sp.name"
              class="group flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              :class="tier.name === 'title' ? 'h-16' : tier.name === 'gold' ? 'h-12' : 'h-9'">
              <img v-if="sp.logo_url" :src="sp.logo_url" :alt="sp.name"
                class="max-h-full max-w-[160px] object-contain" />
              <span v-else class="font-bold text-brand-green text-sm px-4 py-2 border border-brand-green/30 group-hover:bg-brand-cream">
                {{ sp.name }}
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ── SOUVENIRS TEASER ──────────────────────────────────── -->
    <section v-if="featuredSouvenirs.length" class="py-14 md:py-20 bg-brand-green geometric-bg relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-brand-green to-[#013a24]"></div>
      <div class="relative max-w-7xl mx-auto px-4 md:px-6">
        <div class="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <ShoppingBag :size="13" /> Merchandise Store
            </p>
            <h2 class="font-display font-bold text-3xl text-white">{{ orgName }} Souvenirs</h2>
            <p class="text-white/60 mt-1 text-sm">Exclusive pre-order merchandise</p>
          </div>
          <RouterLink to="/shop" class="btn-gold text-xs flex items-center gap-2">
            <ShoppingBag :size="13" /> View All Items
          </RouterLink>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="sv in featuredSouvenirs" :key="sv.id"
            class="bg-white/10 border border-white/20 hover:border-brand-gold/50 transition-all p-4 text-center group flex flex-col">
            <div class="h-24 flex items-center justify-center mb-3 cursor-pointer" @click="openShopItem(sv)">
              <img v-if="sv.image_url" :src="sv.image_url" :alt="sv.name"
                class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
              <Package v-else :size="40" class="text-white/30" />
            </div>
            <p class="text-white font-semibold text-sm group-hover:text-brand-gold transition-colors">{{ sv.name }}</p>
            <p class="text-brand-gold font-display font-bold mt-1">₦{{ fmtP(sv.price) }}</p>
            <button class="mt-3 w-full py-2 text-xs font-bold bg-brand-gold/20 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold hover:text-brand-green transition-all"
              @click="openShopItem(sv)">
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── SPONSORS ────────────────────────────────────────── -->
    <section v-if="sponsors.length" class="py-12 md:py-16 bg-white border-t border-gray-100">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="text-center mb-8 reveal">
          <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-2 flex items-center justify-center gap-2">
            <Handshake :size="13" /> Sponsors & Partners
          </p>
          <h2 class="font-display font-bold text-2xl md:text-3xl text-brand-green">Our Supporters</h2>
        </div>
        <!-- Title sponsors first, large -->
        <div v-if="sponsors.filter(s=>s.tier==='title').length" class="flex justify-center mb-8">
          <div v-for="sp in sponsors.filter(s=>s.tier==='title')" :key="sp.id"
            class="flex flex-col items-center gap-3 px-8">
            <a :href="sp.website_url || '#'" :target="sp.website_url ? '_blank' : '_self'"
              class="h-20 flex items-center justify-center">
              <img v-if="sp.logo_url" :src="sp.logo_url" :alt="sp.name" class="max-h-20 max-w-[200px] object-contain" />
              <span v-else class="font-display font-bold text-2xl text-brand-green">{{ sp.name }}</span>
            </a>
            <span class="badge text-xs" style="background:#FEC70020;color:#FEC700;border:1px solid #FEC70050">Title Sponsor</span>
          </div>
        </div>
        <!-- Other tiers - smaller logos in a row -->
        <div v-if="sponsors.filter(s=>s.tier!=='title').length"
          class="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          <a v-for="sp in sponsors.filter(s=>s.tier!=='title')" :key="sp.id"
            :href="sp.website_url || '#'" :target="sp.website_url ? '_blank' : '_self'"
            class="flex flex-col items-center gap-2 group opacity-70 hover:opacity-100 transition-opacity"
            :title="sp.name">
            <div class="h-12 flex items-center justify-center">
              <img v-if="sp.logo_url" :src="sp.logo_url" :alt="sp.name" class="max-h-12 max-w-[140px] object-contain grayscale group-hover:grayscale-0 transition-all" />
              <span v-else class="font-semibold text-sm text-gray-600">{{ sp.name }}</span>
            </div>
            <span class="text-xs text-gray-400 capitalize">{{ sp.tier }}</span>
          </a>
        </div>
      </div>
    </section>

    <!-- ── FOOTER ────────────────────────────────────────── -->
    <footer class="bg-brand-green text-white py-12 md:py-14">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="flex flex-col md:flex-row items-start justify-between gap-8 md:gap-10 pb-8 border-b border-white/10">
          <div class="max-w-xs">
            <img :src="orgLogo" :alt="orgName" class="h-10 md:h-12 mb-4" />
            <p class="text-white/45 text-sm leading-relaxed">
              {{ eventStore.hasActiveEvent && eventStore.activeEvent?.tagline
                ? eventStore.activeEvent.tagline
                : 'Annual programme dedicated to Islamic youth reformation, career development and community building.' }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-x-12 md:gap-x-16 gap-y-3">
            <div>
              <p class="text-brand-gold font-bold text-xs uppercase tracking-wider mb-3">Navigate</p>
              <div class="space-y-2">
                <button v-for="l in visibleNavLinks" :key="l.id"
                  class="block text-white/55 hover:text-brand-gold transition-colors text-sm text-left"
                  @click="scrollTo(l.id)">{{ l.label }}</button>
              </div>
            </div>
            <div>
              <p class="text-brand-gold font-bold text-xs uppercase tracking-wider mb-3">Links</p>
              <div class="space-y-2 text-sm">
                <RouterLink to="/past-events" class="block text-white/55 hover:text-brand-gold transition-colors">Past Editions</RouterLink>
                <RouterLink to="/shop" class="block text-white/55 hover:text-brand-gold transition-colors">
                  <span class="flex items-center gap-1.5"><ShoppingBag :size="11" /> Merchandise Shop</span>
                </RouterLink>
                <button v-if="eventStore.hasActiveEvent"
                  class="block text-white/55 hover:text-brand-gold transition-colors text-left"
                  @click="scrollTo('tickets')">Register for Ticket</button>
                <a href="/admin/login" class="block text-white/55 hover:text-brand-gold transition-colors">Admin Portal</a>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col md:flex-row items-center justify-between gap-3 pt-5 text-white/25 text-xs">
          <p>© {{ new Date().getFullYear() }} {{ orgName }}. All rights reserved.</p>
          <p class="flex items-center gap-1.5"><Heart :size="11" class="text-brand-gold" /> Built with purpose</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Ticket, CalendarDays, MapPin, ChevronDown, Sparkles, Target, Mic, LayoutList,
  ShieldCheck, Images, History, ArrowRight, Lock, Heart, Menu, X, BookOpen,
  Briefcase, Users, GraduationCap, Youtube, ShoppingBag, Handshake,
} from 'lucide-vue-next';
import { useEventStore }   from '@/stores/eventStore.js';
import { useTenantStore }  from '@/stores/tenantStore.js';
import { useScrollReveal } from '@/composables/useScrollReveal.js';
import CountdownTimer  from '@/components/landing/CountdownTimer.vue';
import SpeakerCard     from '@/components/landing/SpeakerCard.vue';
import TicketCard      from '@/components/landing/TicketCard.vue';
import GalleryMasonry  from '@/components/landing/GalleryMasonry.vue';
import api from '@/composables/useApi.js';

const router     = useRouter();
const eventStore = useEventStore();
const tenantStore = useTenantStore();
const orgName = computed(() => tenantStore.tenant?.name || 'Muslim Youth Summit');
const orgLogo = computed(() => tenantStore.tenant?.logo_url || '/logos/logo-white.png');
const { setupReveal } = useScrollReveal();

const scrolled       = ref(false);
const mobileMenuOpen = ref(false);
const gallery        = ref([]);
const sponsors          = ref([]);
const featuredSouvenirs = ref([]);
const lectures       = ref([]);
const recordingsCount = computed(() => lectures.value.filter(l => l.youtube_url).length);
const eventDays      = ref([]);
const pastEvents     = ref([]);
const heroStep       = ref(0);
const activeDay      = ref(null);

const allNavLinks = [
  { id:'about',       label:'About',        alwaysShow: true,  type:'scroll' },
  { id:'schedule',    label:'Programme',    alwaysShow: false, type:'scroll' },
  { id:'speakers',    label:'Speakers',     alwaysShow: false, type:'scroll' },
  { id:'tickets',     label:'Tickets',      alwaysShow: false, type:'scroll' },
  { id:'past-events', label:'Past Editions',alwaysShow: true,  type:'scroll' },
  { id:'/shop',       label:'Shop',         alwaysShow: true,  type:'route', icon:'ShoppingBag' },
];

const visibleNavLinks = computed(() =>
  allNavLinks.filter(l => l.alwaysShow || eventStore.hasActiveEvent)
);

const aboutStats = [
  { value:'3+',   label:'Editions',  delay:'reveal-delay-1' },
  { value:'500+', label:'Attendees', delay:'reveal-delay-2' },
  { value:'20+',  label:'Speakers',  delay:'reveal-delay-3' },
];

const pillars = [
  { icon: BookOpen,      label: 'Islamic Reformation' },
  { icon: Briefcase,     label: 'Career Development'  },
  { icon: Users,         label: 'Networking'           },
  { icon: GraduationCap, label: 'Knowledge Sharing'   },
];

const filteredLectures = computed(() =>
  activeDay.value
    ? lectures.value.filter(l => l.event_day_id === activeDay.value)
    : lectures.value
);

let scrollHandler;
let stepTimers = [];

onMounted(async () => {
  scrollHandler = () => {
    scrolled.value = window.scrollY > 10;
    if (mobileMenuOpen.value && window.scrollY > 80) mobileMenuOpen.value = false;
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Cinematic entrance
  [50, 200, 500, 900, 1300, 1800].forEach((ms, i) => {
    stepTimers.push(setTimeout(() => { heroStep.value = i + 1; }, ms));
  });

  // Load data
  await Promise.allSettled([
    eventStore.fetchActiveEvent(),
    eventStore.fetchPastEvents(),
  ]);
  pastEvents.value = eventStore.pastEvents;

  // Load sponsors (active event or global)
  try {
    const params = eventStore.activeEvent ? `?event_id=${eventStore.activeEvent.id}` : '';
    const { data } = await api.get(`/sponsors${params}`);
    sponsors.value = data.data || [];
  } catch {}

  if (eventStore.hasActiveEvent) {
    const eid = eventStore.activeEvent.id;
    try {
      const [galRes, lecRes, dayRes] = await Promise.all([
        api.get(`/gallery/${eid}`),
        api.get(`/events/${eid}/schedule`),
        api.get(`/events/${eid}/days`),
      ]);
      gallery.value   = galRes.data.data || [];
      const schData   = lecRes.data.data;
      lectures.value  = Array.isArray(schData) ? schData : (schData?.lectures || []);
      eventDays.value = dayRes.data.data || [];
      if (eventDays.value.length) activeDay.value = eventDays.value[0].id;
    } catch {}
  }

  setTimeout(() => setupReveal(), 400);
});

onUnmounted(() => {
  window.removeEventListener('scroll', scrollHandler);
  stepTimers.forEach(clearTimeout);
});

const SPONSOR_TIER_ORDER = ['title','gold','silver','bronze','media','partner'];
const SPONSOR_TIER_LABELS = { title:'Title Sponsor', gold:'Gold Sponsors', silver:'Silver Sponsors', bronze:'Bronze Sponsors', media:'Media Partners', partner:'Partners' };

const sponsorTiers = computed(() => {
  const byTier = {};
  for (const sp of sponsors.value) {
    if (!byTier[sp.tier]) byTier[sp.tier] = [];
    byTier[sp.tier].push(sp);
  }
  return SPONSOR_TIER_ORDER
    .filter(t => byTier[t]?.length)
    .map(t => ({ name: t, label: SPONSOR_TIER_LABELS[t], items: byTier[t] }));
});

// MySQL returns dates as Date/ISO objects → extract YYYY-MM-DD part
const formatDateForTimer = (d) => {
  if (!d) return '';
  const str = typeof d === 'string' ? d : new Date(d).toISOString();
  return str.slice(0, 10) + 'T09:00:00'; // event typically starts 9am
};

const fmtP = (n) => Number(n||0).toLocaleString('en-NG');

const openShopItem = (sv) => {
  // Redirect to /shop — the shop page has the buy modal
  router.push({ path: '/shop', query: { buy: sv.id } });
};

const scrollTo = (id) => {
  if (id === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
};

const selectTicket = (type) => router.push({ name: 'register', query: { type: type.id } });

const formatDateRange = (start, end) => {
  if (!start) return '';
  const s = new Date(start), e = end ? new Date(end) : null;
  const opts = { day:'numeric', month:'long', year:'numeric' };
  if (!e || s.toDateString() === e.toDateString()) return s.toLocaleDateString('en-NG', opts);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}–${e.toLocaleDateString('en-NG', opts)}`;
  return `${s.toLocaleDateString('en-NG',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('en-NG', opts)}`;
};

const fmtShortDate = (d) => d ? new Date(d).toLocaleDateString('en-NG',{month:'short',day:'numeric'}) : '';

const typeClass = (t) => ({
  lecture:  'bg-blue-50 text-blue-600',
  keynote:  'bg-brand-cream text-brand-green',
  panel:    'bg-purple-50 text-purple-600',
  workshop: 'bg-green-50 text-green-600',
  prayer:   'bg-yellow-50 text-yellow-700',
  break:    'bg-gray-100 text-gray-500',
  other:    'bg-gray-50 text-gray-500',
}[t] ?? 'bg-gray-50 text-gray-400');
</script>

<style scoped>
.beam-sweep::after {
  content: '';
  position: absolute;
  top: -100%;
  left: -80%;
  width: 50%;
  height: 350%;
  background: linear-gradient(105deg, transparent 20%, rgba(254,199,0,0.15) 50%, transparent 80%);
  animation: beamSweepOnce 2s ease-in-out 0.5s forwards;
}
@keyframes beamSweepOnce {
  0%   { left: -80%; opacity: 1; }
  100% { left: 160%; opacity: 0; }
}
.slide-down-nav-enter-active { transition: all 0.25s ease; }
.slide-down-nav-leave-active { transition: all 0.2s ease; }
.slide-down-nav-enter-from, .slide-down-nav-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
