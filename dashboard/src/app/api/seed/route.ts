import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const DREAM_CATEGORIES = ['solo_trip', 'salary', 'side_hustle', 'self_growth'] as const
const PACES = ['delusional', 'steady', 'flow'] as const
const MOVE_TYPES = ['quick', 'power', 'boss'] as const

const FIRST_NAMES = [
  'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William',
  'Benjamin', 'Lucas', 'Henry', 'Alexander', 'Maya', 'Luna', 'Aria', 'Chloe',
  'Zoe', 'Lily', 'Layla', 'Riley', 'Nora', 'Zoey', 'Mila', 'Aubrey', 'Hannah',
  'Addison', 'Eleanor', 'Natalie', 'Leah', 'Savannah', 'Brooklyn',
  'Aiden', 'Jackson', 'Sebastian', 'Mateo', 'Owen', 'Daniel', 'Logan', 'Jack'
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
]

const BLOCKERS = [
  'Fear of failure', 'Not enough time', 'Lack of motivation', 'Financial constraints',
  'Self-doubt', 'Procrastination', 'No clear plan', 'Fear of judgment', 'Overwhelm', 'Perfectionism'
]

const QUICK_MOVES = [
  { title: 'Journal for 5 minutes', description: 'Write down 3 things I\'m grateful for' },
  { title: 'Read 10 pages', description: 'Reading a self-improvement book' },
  { title: 'Meditate for 10 minutes', description: 'Morning meditation session' },
  { title: 'Save $5 to dream fund', description: 'Small step towards my goal' },
  { title: 'Research destinations', description: 'Looked up flight prices' },
  { title: 'Update my resume', description: 'Added recent experience' },
  { title: 'Network on LinkedIn', description: 'Connected with 3 people in my industry' },
  { title: 'Practice a skill for 15 min', description: 'Learning something new' },
]

const POWER_MOVES = [
  { title: 'Complete online course module', description: 'Finished week 2 of the certification' },
  { title: 'Book a flight', description: 'Finally booked my dream destination!' },
  { title: 'Apply to 5 jobs', description: 'Sent out applications for higher-paying roles' },
  { title: 'Launch social media page', description: 'Started my side hustle Instagram' },
  { title: 'Have a difficult conversation', description: 'Asked my boss about promotion' },
  { title: 'Create a business plan', description: 'Outlined my side hustle strategy' },
]

const BOSS_MOVES = [
  { title: 'Got the job offer!', description: 'Received offer with 40% salary increase' },
  { title: 'First paying customer', description: 'Someone bought my product!' },
  { title: 'Landed in my dream city', description: 'Finally took the solo trip' },
  { title: 'Hit savings goal', description: 'Reached my emergency fund target' },
  { title: 'Launched my business', description: 'Side hustle is officially live' },
]

const PROOF_TEXTS = [
  'Screenshot attached showing my progress', 'Took a photo to prove I did it!',
  'Journal entry as proof', 'Receipt from my purchase', 'Email confirmation attached',
]

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  date.setHours(randomInt(6, 22), randomInt(0, 59), 0, 0)
  return date.toISOString()
}

export async function POST() {
  try {
    // Clear existing data
    await supabase.from('moves').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('analytics_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('sponsored_challenges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('daily_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Create 50 users
    const users = []
    for (let i = 0; i < 50; i++) {
      const firstName = randomItem(FIRST_NAMES)
      const lastName = randomItem(LAST_NAMES)
      users.push({
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@email.com`,
        dream_category: randomItem(DREAM_CATEGORIES),
        blocker: randomItem(BLOCKERS),
        pace: randomItem(PACES),
        created_at: randomDate(60),
        streak_count: randomInt(0, 45),
        total_moves: randomInt(5, 100),
        is_premium: Math.random() > 0.75,
      })
    }

    const { data: createdUsers, error: usersError } = await supabase
      .from('users')
      .insert(users)
      .select()

    if (usersError) throw usersError

    // Create 500 moves
    const moves = []
    for (let i = 0; i < 500; i++) {
      const user = randomItem(createdUsers!)
      const moveType = randomItem(MOVE_TYPES)
      let moveData
      let points

      if (moveType === 'quick') {
        moveData = randomItem(QUICK_MOVES)
        points = 10
      } else if (moveType === 'power') {
        moveData = randomItem(POWER_MOVES)
        points = 25
      } else {
        moveData = randomItem(BOSS_MOVES)
        points = 50
      }

      moves.push({
        user_id: user.id,
        move_type: moveType,
        title: moveData.title,
        description: moveData.description,
        proof_text: Math.random() > 0.3 ? randomItem(PROOF_TEXTS) : null,
        ai_verified: Math.random() > 0.4,
        ai_feedback: Math.random() > 0.5 ? 'Great job! Keep up the momentum!' : null,
        points: points,
        completed_at: randomDate(30),
      })
    }

    for (let i = 0; i < moves.length; i += 100) {
      const batch = moves.slice(i, i + 100)
      await supabase.from('moves').insert(batch)
    }

    // Create 5 sponsored challenges
    const challenges = [
      { title: '7-Day Mindfulness Challenge', sponsor_name: 'Headspace', category: 'self_growth' },
      { title: 'Learn a New Skill Week', sponsor_name: 'Skillshare', category: 'salary' },
      { title: 'Solo Adventure Challenge', sponsor_name: 'Airbnb', category: 'solo_trip' },
      { title: 'Save $500 Challenge', sponsor_name: 'Acorns', category: 'side_hustle' },
      { title: 'Side Hustle Sprint', sponsor_name: 'Notion', category: 'side_hustle' },
    ].map((c, i) => ({
      ...c,
      description: `Join the ${c.title} and win prizes!`,
      move_type: randomItem(MOVE_TYPES),
      points_bonus: randomInt(10, 50),
      start_date: new Date(Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + randomInt(7, 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: i < 3,
    }))

    await supabase.from('sponsored_challenges').insert(challenges)

    // Create 20 daily tasks with Gabby-style descriptions
    const tasks = [
      { category: 'solo_trip', move_type: 'quick', title: 'Save $10 to travel fund', tier: 1, description: 'transfer $10 to your trip savings rn — future you will literally thank you so much 💸' },
      { category: 'solo_trip', move_type: 'quick', title: 'Research one destination', tier: 1, description: 'look up 3 hostels and screenshot your faves — future you will thank you 📸' },
      { category: 'solo_trip', move_type: 'power', title: 'Book accommodation', tier: 2, description: 'find a hostel or airbnb with good vibes and HIT BOOK!! refundable is totally fine bestie 🏠' },
      { category: 'solo_trip', move_type: 'power', title: 'Plan your itinerary', tier: 2, description: 'map out day 1 of your trip — what are you doing first when you land?? ✈️' },
      { category: 'solo_trip', move_type: 'boss', title: 'Book your flight', tier: 3, description: 'STOP RESEARCHING and just BOOK IT omg you got this!! pull the trigger bestie 🎫' },
      { category: 'salary', move_type: 'quick', title: 'Update LinkedIn profile', tier: 1, description: 'refresh your headline to say what you actually want to be doing — speak it into existence 💫' },
      { category: 'salary', move_type: 'quick', title: 'Research market salary rates', tier: 1, description: 'spend 5 mins on glassdoor seeing what your role ACTUALLY pays — knowledge is power sis 📊' },
      { category: 'salary', move_type: 'power', title: 'Apply to 3 higher-paying jobs', tier: 2, description: 'send out 3 applications TODAY even if you feel unqualified — let them tell you no 💅' },
      { category: 'salary', move_type: 'power', title: 'Prepare negotiation talking points', tier: 2, description: 'write down 3 reasons you deserve more $$ and practice saying them out loud 🎤' },
      { category: 'salary', move_type: 'boss', title: 'Schedule salary negotiation meeting', tier: 3, description: 'email your manager and request time to discuss compensation — you are THAT girl 👑' },
      { category: 'side_hustle', move_type: 'quick', title: 'Brainstorm business ideas', tier: 1, description: 'write 5 ideas in your notes app rn — bad ideas lead to good ideas bestie 💡' },
      { category: 'side_hustle', move_type: 'quick', title: 'Create social media content', tier: 1, description: 'film one reel or write one post about your thing — done is better than perfect 📱' },
      { category: 'side_hustle', move_type: 'power', title: 'Set up business account', tier: 2, description: 'make it official!! create the IG or register the domain — this is happening 🔥' },
      { category: 'side_hustle', move_type: 'power', title: 'Create your first product', tier: 2, description: 'build the MVP, write the ebook, design the template — make the thing!! 🛠️' },
      { category: 'side_hustle', move_type: 'boss', title: 'Make your first sale', tier: 3, description: 'DM 5 people, post the link, ask for the sale — revenue is validation babe 💰' },
      { category: 'self_growth', move_type: 'quick', title: 'Meditate for 10 minutes', tier: 1, description: 'close your eyes and breathe — your nervous system will literally thank you 🧘‍♀️' },
      { category: 'self_growth', move_type: 'quick', title: 'Read for 20 minutes', tier: 1, description: 'that book on your shelf?? crack it open for 20 mins — feeding your brain is self care 📚' },
      { category: 'self_growth', move_type: 'power', title: 'Complete a course module', tier: 2, description: 'watch one lesson and take notes — investing in yourself always pays off 🎓' },
      { category: 'self_growth', move_type: 'power', title: 'Journal about your progress', tier: 2, description: 'write down 3 wins from this week no matter how small — celebrate yourself queen 📝' },
      { category: 'self_growth', move_type: 'boss', title: 'Complete a 30-day challenge', tier: 3, description: 'finish what you started!! day 30 is calling and you are SO ready for it 🏆' },
    ].map(t => ({
      ...t,
      is_active: true,
    }))

    await supabase.from('daily_tasks').insert(tasks)

    return NextResponse.json({
      success: true,
      data: {
        users: createdUsers?.length || 0,
        moves: moves.length,
        challenges: challenges.length,
        tasks: tasks.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
