<?php

namespace Database\Seeders;

use App\Models\Exam;
use App\Models\HomeCard;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\Subject;
use App\Models\TestSeries;
use Illuminate\Database\Seeder;

/**
 * Sample Himachal Pradesh content: a shared subject bank (subject -> topic -> questions), exams that link
 * to the subjects they cover, and a few tests per exam. Safe to run repeatedly: everything is matched by
 * name or text, and questions that have no topic yet are given theirs.
 */
class ContentSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->bank() as $subjectName => $topics) {
            $subject = Subject::firstOrCreate(['name' => $subjectName]);

            foreach (array_keys($topics) as $position => $topicName) {
                $topic = $subject->topics()->firstOrCreate(['name' => $topicName], ['position' => $position]);

                foreach ($topics[$topicName] as [$text, $options, $correct, $explanation, $difficulty]) {
                    $question = Question::firstOrCreate(
                        ['subject_id' => $subject->id, 'text' => $text],
                        [
                            'option_a' => $options[0],
                            'option_b' => $options[1],
                            'option_c' => $options[2],
                            'option_d' => $options[3],
                            'correct_option' => $correct,
                            'explanation' => $explanation,
                            'difficulty' => $difficulty,
                        ],
                    );

                    if ($question->topic_id === null) {
                        $question->update(['topic_id' => $topic->id]);
                    }
                }
            }
        }

        foreach ($this->exams() as $examName => $exam) {
            $examModel = Exam::firstOrCreate(['name' => $examName], ['description' => $exam['description'], 'is_active' => true]);
            $examModel->subjects()->syncWithoutDetaching(Subject::whereIn('name', $exam['subjects'])->pluck('id'));

            // Sample exam page and price, only while the page is still blank, so edits made in admin are kept.
            if ($examModel->overview === null) {
                $examModel->update($exam['page']);
            }

            foreach ($exam['tests'] as $spec) {
                [$title, $minutes, $negative, $subjectFilter] = $spec;

                $test = MockTest::firstOrCreate(
                    ['exam_id' => $examModel->id, 'title' => $title],
                    ['duration_minutes' => $minutes, 'marks_per_question' => 1, 'negative_marks' => $negative, 'is_published' => true]
                        + ($spec[4] ?? []), // optional extras: type, year, is_free, price
                );

                if ($test->questions()->doesntExist()) {
                    $ids = Question::whereIn('subject_id', $examModel->subjects()->when($subjectFilter, fn ($q) => $q->where('name', $subjectFilter))->pluck('subjects.id'))
                        ->orderBy('id')
                        ->pluck('id');

                    $test->questions()->attach($ids->values()->mapWithKeys(fn ($id, $i) => [$id => ['position' => $i + 1]])->all());
                }
            }
        }

        $this->homepage();
    }

    /**
     * A sample test series and the homepage carousel cards. Change them under Homepage in the admin area.
     */
    private function homepage(): void
    {
        $hpas = Exam::firstWhere('name', 'HPAS (HPPSC Himachal Administrative Service)');
        $series = TestSeries::firstOrCreate(
            ['title' => 'HPAS Prelims Test Series 2026'],
            ['exam_id' => $hpas->id, 'description' => 'Full-length prelims mocks on the latest HPPSC pattern, with Himachal GK focus and detailed solutions.', 'is_free' => false, 'price' => 199, 'is_published' => true],
        );
        if ($series->mockTests()->doesntExist()) {
            $ids = MockTest::where('exam_id', $hpas->id)->where('type', 'mock')->orderBy('id')->pluck('id');
            $series->mockTests()->attach($ids->values()->mapWithKeys(fn ($id, $i) => [$id => ['position' => $i + 1]])->all());
        }

        if (HomeCard::exists()) {
            return;
        }

        $cards = [
            [$series, 'Bestseller', ['Full Length', 'HP GK Focus', 'Full Solutions'], 'Free Demo'],
            [MockTest::firstWhere('title', 'HP TET JBT Practice Set 1'), 'Most Popular', [], null],
            [MockTest::firstWhere('title', 'Patwari Practice Set 1'), 'Trending', [], 'Speed Timer'],
            [MockTest::firstWhere('title', 'Constable Practice Set 1'), null, [], null],
        ];

        foreach (array_values(array_filter($cards, fn ($card) => $card[0])) as $position => [$item, $badge, $highlights, $tag]) {
            HomeCard::create([
                'section' => 'tests', 'cardable_type' => $item->getMorphClass(), 'cardable_id' => $item->id,
                'badge' => $badge, 'highlights' => $highlights, 'tag' => $tag, 'position' => $position + 1,
            ]);
        }
    }

    /**
     * Subject => topic => questions. Question tuple: [text, [A, B, C, D], correct letter, explanation, difficulty]
     */
    private function bank(): array
    {
        return [
            'Himachal Pradesh GK' => [
                'Districts' => [
                    ['How many districts does Himachal Pradesh have?', ['10', '11', '12', '13'], 'C', 'Himachal Pradesh has 12 districts.', 'easy'],
                    ['Which is the largest district of Himachal Pradesh by area?', ['Chamba', 'Kinnaur', 'Kullu', 'Lahaul and Spiti'], 'D', 'Lahaul and Spiti is the largest district by area.', 'easy'],
                    ['Which is the smallest district of Himachal Pradesh by area?', ['Hamirpur', 'Una', 'Bilaspur', 'Solan'], 'A', 'Hamirpur is the smallest district by area.', 'medium'],
                    ['Which district has the highest population in Himachal Pradesh (2011 Census)?', ['Mandi', 'Shimla', 'Kangra', 'Solan'], 'C', 'Kangra is the most populous district.', 'easy'],
                    ['The Great Himalayan National Park, a UNESCO World Heritage Site, is in which district?', ['Kullu', 'Chamba', 'Kinnaur', 'Lahaul and Spiti'], 'A', 'GHNP in Kullu district was inscribed in 2014.', 'medium'],
                    ['The Jwalamukhi temple is located in which district?', ['Mandi', 'Kangra', 'Una', 'Bilaspur'], 'B', 'Jwalamukhi is in Kangra district.', 'easy'],
                    ['Pin Valley National Park is located in which district?', ['Kinnaur', 'Lahaul and Spiti', 'Kullu', 'Sirmaur'], 'B', 'Pin Valley lies in the cold desert of Spiti.', 'medium'],
                    ['The Gaddi tribe is mainly found in which region?', ['Una and Bilaspur', 'Chamba and Kangra', 'Solan and Sirmaur', 'Hamirpur and Mandi'], 'B', 'Gaddis are shepherds of the Dhauladhar region, mainly Chamba and Kangra.', 'medium'],
                    ['Tabo Monastery, founded in 996 AD, is located in which district?', ['Kinnaur', 'Lahaul and Spiti', 'Kullu', 'Chamba'], 'B', 'Tabo in Spiti is among the oldest continuously operating monasteries.', 'medium'],
                ],
                'Rivers, Lakes & Glaciers' => [
                    ['Through which pass does the river Sutlej enter India from Tibet?', ['Rohtang Pass', 'Shipki La', 'Baralacha La', 'Kunzum Pass'], 'B', 'The Sutlej enters Himachal Pradesh at Shipki La in Kinnaur.', 'medium'],
                    ['From where does the river Beas originate?', ['Beas Kund near Rohtang Pass', 'Mansarovar Lake', 'Bara Bhangal', 'Chandratal'], 'A', 'The Beas rises at Beas Kund near the Rohtang Pass in Kullu.', 'easy'],
                    ['The Gobind Sagar reservoir is formed by which dam?', ['Pong Dam', 'Pandoh Dam', 'Bhakra Dam', 'Chamera Dam'], 'C', 'Gobind Sagar is the reservoir of the Bhakra Dam on the Sutlej.', 'easy'],
                    ['The Pong Dam (Maharana Pratap Sagar) is built on which river?', ['Sutlej', 'Beas', 'Ravi', 'Yamuna'], 'B', 'Pong Dam is on the Beas river in Kangra district.', 'medium'],
                    ['The Chenab river is formed by the meeting of Chandra and Bhaga at which place?', ['Keylong', 'Tandi', 'Kaza', 'Sissu'], 'B', 'Chandra and Bhaga meet at Tandi in Lahaul to form the Chandrabhaga (Chenab).', 'medium'],
                    ['The Renuka Lake, the largest natural lake of Himachal Pradesh, is in which district?', ['Sirmaur', 'Solan', 'Mandi', 'Kangra'], 'A', 'Renuka Lake is in Sirmaur district.', 'medium'],
                    ['Bara Shigri, one of the longest glaciers of the Himalaya, is in which district?', ['Kinnaur', 'Lahaul and Spiti', 'Chamba', 'Kullu'], 'B', 'Bara Shigri lies in the Chandra valley of Lahaul.', 'hard'],
                    ['Chandratal Lake is located in which district?', ['Kullu', 'Lahaul and Spiti', 'Chamba', 'Kinnaur'], 'B', 'Chandratal lies in the Spiti part of Lahaul and Spiti.', 'easy'],
                ],
                'History & Statehood' => [
                    ['On which date did Himachal Pradesh attain full statehood?', ['15 April 1948', '26 January 1950', '25 January 1971', '1 November 1966'], 'C', 'Himachal Pradesh became the 18th state of India on 25 January 1971.', 'easy'],
                    ['Who is credited with introducing apple cultivation in Himachal Pradesh at Kotgarh?', ['Samuel Evans Stokes', 'Lord Dalhousie', 'Y.S. Parmar', 'Captain Kennedy'], 'A', 'Samuel Evans Stokes (Satyananda Stokes) planted apples at Kotgarh in the early 20th century.', 'medium'],
                    ['Who was the first Chief Minister of Himachal Pradesh?', ['Thakur Ram Lal', 'Dr. Y.S. Parmar', 'Shanta Kumar', 'Virbhadra Singh'], 'B', 'Dr. Yashwant Singh Parmar is regarded as the architect of Himachal Pradesh.', 'easy'],
                    ['Himachal Pradesh was formed on 15 April 1948 by merging how many princely states?', ['10', '21', '30', '45'], 'C', 'About 30 princely states of the Punjab Hill region were merged to form it.', 'hard'],
                    ['The name Shimla is derived from which goddess?', ['Hadimba Devi', 'Shyamala Devi', 'Naina Devi', 'Bhimakali'], 'B', 'Shimla takes its name from Shyamala Devi, a form of Kali.', 'medium'],
                    ['Himachal Day is celebrated every year on:', ['25 January', '15 April', '26 January', '1 November'], 'B', 'It marks the formation of Himachal Pradesh on 15 April 1948.', 'easy'],
                    ['The great Kangra earthquake occurred in which year?', ['1897', '1905', '1934', '1950'], 'B', 'The Kangra earthquake struck on 4 April 1905.', 'medium'],
                    ['Who is known as "Pahari Gandhi"?', ['Baba Kanshi Ram', 'Y.S. Parmar', 'Padam Dev', 'Thakur Sen Negi'], 'A', 'Baba Kanshi Ram was a freedom fighter and poet called Pahari Gandhi.', 'hard'],
                ],
                'Culture, Fairs & Temples' => [
                    ['The International Dussehra festival of Kullu is held at which ground?', ['Ridge Ground', 'Dhalpur Maidan', 'Chaugan', 'Gandhi Maidan'], 'B', 'Kullu Dussehra is celebrated at the Dhalpur Maidan.', 'easy'],
                    ['The Hadimba Devi temple is located at:', ['Manali', 'Dharamshala', 'Kasauli', 'Chamba'], 'A', 'The temple is in the cedar forest at Manali.', 'easy'],
                    ['The Minjar Fair is celebrated in which district?', ['Chamba', 'Kullu', 'Shimla', 'Solan'], 'A', 'The Minjar fair is a famous festival of Chamba.', 'medium'],
                    ['Chamba Rumal is a famous ___ craft of Himachal Pradesh.', ['Embroidery', 'Pottery', 'Wood carving', 'Metalwork'], 'A', 'Chamba Rumal is a distinctive embroidery on cloth.', 'medium'],
                    ['The Lavi Fair is held at which place?', ['Rampur Bushahr', 'Kullu', 'Nahan', 'Bilaspur'], 'A', 'The Lavi fair is a trade fair at Rampur Bushahr.', 'medium'],
                ],
                'Tourism & Transport' => [
                    ['The Atal Tunnel connects Manali with which valley?', ['Spiti Valley', 'Kinnaur Valley', 'Lahaul Valley', 'Pangi Valley'], 'C', 'The 9.02 km Atal Tunnel provides all-weather access from Manali to Lahaul.', 'easy'],
                    ['The Kalka-Shimla Railway was inscribed as a UNESCO World Heritage Site in which year?', ['2005', '2008', '2010', '2014'], 'B', 'It became a UNESCO World Heritage Site in 2008 as part of the Mountain Railways of India.', 'medium'],
                    ['Which hill station in Chamba is called the "Mini Switzerland of India"?', ['Dalhousie', 'Khajjiar', 'Bharmour', 'Tisa'], 'B', 'Khajjiar is known as Mini Switzerland.', 'easy'],
                    ['The Rohtang Pass connects Kullu with:', ['Kinnaur', 'Lahaul and Spiti', 'Chamba', 'Shimla'], 'B', 'Rohtang Pass links Kullu valley and Lahaul-Spiti.', 'easy'],
                ],
                'Polity & Administration' => [
                    ['Which city was declared the second (winter) capital of Himachal Pradesh in 2017?', ['Shimla', 'Dharamshala', 'Mandi', 'Solan'], 'B', 'Dharamshala, in Kangra district, was declared the winter capital.', 'easy'],
                    ['How many Lok Sabha seats does Himachal Pradesh have?', ['3', '4', '5', '6'], 'B', 'Himachal Pradesh sends 4 members to the Lok Sabha.', 'easy'],
                    ['Where is the High Court of Himachal Pradesh located?', ['Dharamshala', 'Mandi', 'Shimla', 'Solan'], 'C', 'The High Court is at Shimla.', 'easy'],
                    ['How many seats are there in the Himachal Pradesh Legislative Assembly?', ['60', '64', '68', '72'], 'C', 'The Vidhan Sabha has 68 seats.', 'easy'],
                ],
            ],
            'Indian Polity' => [
                'Constitution' => [
                    ['Who was the Chairman of the Drafting Committee of the Indian Constitution?', ['Dr. Rajendra Prasad', 'Dr. B.R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Patel'], 'B', 'Dr. B.R. Ambedkar chaired the Drafting Committee.', 'easy'],
                    ['The Constitution of India came into effect on:', ['15 August 1947', '26 November 1949', '26 January 1950', '2 October 1950'], 'C', 'It was adopted on 26 November 1949 and came into force on 26 January 1950.', 'easy'],
                    ['Which Article guarantees equality before law?', ['Article 14', 'Article 19', 'Article 21', 'Article 32'], 'A', 'Article 14 guarantees equality before law and equal protection of the laws.', 'medium'],
                    ['Fundamental Duties were added to the Constitution by which Amendment?', ['24th', '42nd', '44th', '73rd'], 'B', 'The 42nd Amendment (1976) added Fundamental Duties.', 'medium'],
                ],
                'Union & State Government' => [
                    ['What is the minimum age to be elected President of India?', ['25 years', '30 years', '35 years', '40 years'], 'C', 'A candidate must be at least 35 years old.', 'easy'],
                    ['The maximum strength of the Rajya Sabha is:', ['200', '238', '250', '552'], 'C', 'The Rajya Sabha can have at most 250 members.', 'medium'],
                    ['The Governor of a state is appointed by:', ['Chief Minister', 'President', 'Prime Minister', 'Chief Justice'], 'B', 'The President appoints the Governor.', 'easy'],
                ],
                'Local Government' => [
                    ['Panchayati Raj was given constitutional status by which Amendment?', ['61st', '73rd', '86th', '101st'], 'B', 'The 73rd Amendment (1992) added Part IX on Panchayats.', 'medium'],
                ],
            ],
            'General Science' => [
                'Physics' => [
                    ['The SI unit of force is:', ['Joule', 'Newton', 'Pascal', 'Watt'], 'B', 'Force is measured in newtons.', 'easy'],
                    ['The approximate speed of light in vacuum is:', ['3 x 10^6 m/s', '3 x 10^8 m/s', '3 x 10^10 m/s', '3 x 10^5 m/s'], 'B', 'Light travels at about 3 x 10^8 metres per second.', 'medium'],
                ],
                'Chemistry' => [
                    ['What is the chemical symbol of sodium?', ['So', 'Na', 'S', 'Sd'], 'B', 'Sodium comes from the Latin natrium.', 'easy'],
                    ['Which gas is most abundant in the Earth\'s atmosphere?', ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'], 'C', 'Nitrogen makes up about 78% of the atmosphere.', 'easy'],
                ],
                'Biology' => [
                    ['Deficiency of which vitamin causes scurvy?', ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'], 'C', 'Scurvy is caused by a lack of Vitamin C.', 'easy'],
                    ['Which organelle is called the powerhouse of the cell?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 'C', 'Mitochondria release energy through respiration.', 'easy'],
                ],
            ],
            'Reasoning and Maths' => [
                'Series & Patterns' => [
                    ['Find the next number: 2, 4, 8, 16, ?', ['24', '30', '32', '64'], 'C', 'Each term is doubled.', 'easy'],
                    ['Find the next number: 3, 6, 11, 18, 27, ?', ['36', '38', '40', '42'], 'B', 'Differences are 3, 5, 7, 9, so the next difference is 11: 27 + 11 = 38.', 'medium'],
                ],
                'Coding & Classification' => [
                    ['If A=1, B=2, C=3 and so on, what is the value of CAB?', ['5', '6', '7', '8'], 'B', '3 + 1 + 2 = 6.', 'easy'],
                    ['Which is the odd one out: Apple, Mango, Potato, Banana?', ['Apple', 'Mango', 'Potato', 'Banana'], 'C', 'Potato is a vegetable; the others are fruits.', 'easy'],
                ],
                'Arithmetic' => [
                    ['What is 25% of 480?', ['100', '110', '120', '140'], 'C', '480 x 25/100 = 120.', 'easy'],
                    ['A train travelling at 60 km/h covers how much distance in 3 hours?', ['120 km', '150 km', '180 km', '200 km'], 'C', 'Distance = speed x time = 60 x 3.', 'easy'],
                    ['Simple interest on Rs 1000 at 10% per annum for 2 years is:', ['Rs 100', 'Rs 200', 'Rs 210', 'Rs 220'], 'B', 'SI = 1000 x 10 x 2 / 100 = Rs 200.', 'easy'],
                    ['The average of 10, 20, 30, 40 and 50 is:', ['20', '25', '30', '35'], 'C', 'Sum 150 divided by 5 = 30.', 'easy'],
                ],
            ],
            'General Knowledge' => [
                'Indian Geography' => [
                    ['Which is the largest state of India by area?', ['Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh'], 'C', 'Rajasthan is the largest state by area.', 'easy'],
                    ['Which is the longest river flowing within India?', ['Yamuna', 'Ganga', 'Godavari', 'Narmada'], 'B', 'The Ganga is the longest river in India.', 'medium'],
                ],
                'National Symbols & Monuments' => [
                    ['The national animal of India is:', ['Lion', 'Tiger', 'Elephant', 'Leopard'], 'B', 'The Bengal tiger is the national animal.', 'easy'],
                    ['The Taj Mahal is located in which city?', ['Delhi', 'Jaipur', 'Agra', 'Lucknow'], 'C', 'The Taj Mahal is in Agra, Uttar Pradesh.', 'easy'],
                ],
                'History & Economy' => [
                    ['Which institution regulates the currency of India?', ['SEBI', 'NITI Aayog', 'Reserve Bank of India', 'Finance Commission'], 'C', 'The RBI issues currency and manages monetary policy.', 'easy'],
                    ['Who was the first Prime Minister of India?', ['Sardar Patel', 'Lal Bahadur Shastri', 'Jawaharlal Nehru', 'Rajendra Prasad'], 'C', 'Jawaharlal Nehru took office in 1947.', 'easy'],
                ],
            ],
            'Child Development and Pedagogy' => [
                'Learning Theories' => [
                    ['Who is known as the father of psychoanalysis?', ['Jean Piaget', 'Sigmund Freud', 'B.F. Skinner', 'Lev Vygotsky'], 'B', 'Sigmund Freud founded psychoanalysis.', 'easy'],
                    ['The concept of the Zone of Proximal Development was given by:', ['Vygotsky', 'Bruner', 'Pavlov', 'Thorndike'], 'A', 'Lev Vygotsky introduced the ZPD.', 'medium'],
                    ['Operant conditioning is associated with:', ['Pavlov', 'B.F. Skinner', 'Freud', 'Kohlberg'], 'B', 'B.F. Skinner developed operant conditioning.', 'easy'],
                ],
                'Development Stages' => [
                    ['According to Piaget, children aged 7 to 11 are in which stage?', ['Sensorimotor', 'Preoperational', 'Concrete operational', 'Formal operational'], 'C', 'The concrete operational stage spans about 7 to 11 years.', 'medium'],
                    ['Kohlberg\'s theory is related to which area of development?', ['Cognitive', 'Physical', 'Moral', 'Language'], 'C', 'Kohlberg proposed stages of moral development.', 'easy'],
                ],
                'Education Policy' => [
                    ['The Right to Education Act, 2009 provides free and compulsory education to children aged:', ['3 to 10', '5 to 12', '6 to 14', '6 to 18'], 'C', 'The RTE Act covers ages 6 to 14.', 'easy'],
                ],
            ],
            'Environmental Studies' => [
                'Living Beings' => [
                    ['The process by which plants make their own food is called:', ['Respiration', 'Photosynthesis', 'Transpiration', 'Digestion'], 'B', 'Plants make food using sunlight in photosynthesis.', 'easy'],
                    ['Which gas do living beings need for respiration?', ['Nitrogen', 'Carbon dioxide', 'Oxygen', 'Hydrogen'], 'C', 'Oxygen is used in respiration.', 'easy'],
                ],
                'Energy & Space' => [
                    ['Which of these is a renewable source of energy?', ['Coal', 'Petrol', 'Solar energy', 'Natural gas'], 'C', 'Solar energy is renewable.', 'easy'],
                    ['Which is the largest planet of the solar system?', ['Saturn', 'Earth', 'Jupiter', 'Neptune'], 'C', 'Jupiter is the largest planet.', 'easy'],
                ],
            ],
            'English' => [
                'Vocabulary' => [
                    ['Choose the synonym of "Rapid".', ['Slow', 'Quick', 'Heavy', 'Quiet'], 'B', 'Rapid means quick.', 'easy'],
                    ['Choose the antonym of "Ancient".', ['Old', 'Modern', 'Historic', 'Past'], 'B', 'Modern is the opposite of ancient.', 'easy'],
                ],
                'Grammar' => [
                    ['Fill in the blank: She ___ to school every day.', ['go', 'goes', 'going', 'gone'], 'B', 'A singular subject takes "goes" in the simple present.', 'easy'],
                    ['What is the plural of "child"?', ['Childs', 'Childes', 'Children', 'Childrens'], 'C', 'Child has an irregular plural, children.', 'easy'],
                    ['What is the past tense of "write"?', ['Writed', 'Wrote', 'Written', 'Writing'], 'B', 'The past tense is wrote; written is the past participle.', 'easy'],
                ],
            ],
            'Mathematics' => [
                'Number System' => [
                    ['What is 7 x 8?', ['54', '56', '58', '64'], 'B', '7 x 8 = 56.', 'easy'],
                    ['What is the LCM of 4 and 6?', ['10', '12', '18', '24'], 'B', 'The smallest common multiple is 12.', 'easy'],
                    ['3/4 expressed as a decimal is:', ['0.25', '0.5', '0.75', '0.34'], 'C', '3 divided by 4 is 0.75.', 'easy'],
                ],
                'Percentages' => [
                    ['What is 15% of 200?', ['20', '25', '30', '35'], 'C', '200 x 15/100 = 30.', 'easy'],
                    ['What is 12% of 250?', ['25', '30', '35', '40'], 'B', '250 x 12/100 = 30.', 'easy'],
                ],
                'Mensuration' => [
                    ['The perimeter of a square with side 5 cm is:', ['10 cm', '15 cm', '20 cm', '25 cm'], 'C', 'Perimeter = 4 x side = 20 cm.', 'easy'],
                    ['The area of a rectangle with length 12 m and breadth 5 m is:', ['34 sq m', '50 sq m', '60 sq m', '64 sq m'], 'C', 'Area = length x breadth.', 'easy'],
                    ['One hectare is equal to:', ['100 sq m', '1,000 sq m', '10,000 sq m', '1,00,000 sq m'], 'C', '1 hectare = 10,000 square metres, important for land records.', 'medium'],
                ],
                'Ratio & Unit Cost' => [
                    ['If one pen costs Rs 12, what is the cost of 5 pens?', ['Rs 50', 'Rs 55', 'Rs 60', 'Rs 65'], 'C', '12 x 5 = 60.', 'easy'],
                    ['The ratio 20:30 in simplest form is:', ['1:2', '2:3', '3:4', '4:5'], 'B', 'Divide both by 10 to get 2:3.', 'easy'],
                ],
            ],
            'Computer Basics' => [
                'Hardware & Memory' => [
                    ['What does CPU stand for?', ['Central Processing Unit', 'Central Program Unit', 'Computer Personal Unit', 'Control Processing Unit'], 'A', 'CPU stands for Central Processing Unit.', 'easy'],
                    ['Which of the following is an input device?', ['Monitor', 'Printer', 'Keyboard', 'Speaker'], 'C', 'A keyboard sends input to the computer.', 'easy'],
                    ['One byte is equal to how many bits?', ['4', '8', '16', '32'], 'B', '1 byte = 8 bits.', 'easy'],
                    ['RAM is which type of memory?', ['Volatile', 'Non-volatile', 'Read-only', 'Optical'], 'A', 'RAM loses its contents when power is off.', 'medium'],
                ],
                'Software & Shortcuts' => [
                    ['Which keyboard shortcut is used to copy selected text?', ['Ctrl + V', 'Ctrl + X', 'Ctrl + C', 'Ctrl + Z'], 'C', 'Ctrl + C copies; Ctrl + V pastes.', 'easy'],
                    ['What is the default file extension of a modern MS Excel workbook?', ['.docx', '.xlsx', '.pptx', '.txt'], 'B', 'Excel workbooks use .xlsx.', 'medium'],
                ],
            ],
        ];
    }

    /**
     * Exam => description, linked subjects and tests.
     * Test tuple: [title, minutes, negative marks per wrong answer, subject name filter or null for all subjects, extras]
     */
    private function exams(): array
    {
        return [
            'HPAS (HPPSC Himachal Administrative Service)' => [
                'description' => 'Himachal Pradesh Public Service Commission combined competitive examination for the Himachal Administrative Service and allied services.',
                'page' => [
                    'overview' => "The Himachal Pradesh Administrative Services Combined Competitive Examination is conducted by the Himachal Pradesh Public Service Commission (HPPSC) to recruit officers for HPAS and allied services.\n\nSelection is in three stages: a preliminary examination (objective), a main examination (descriptive) and a personality test. Himachal Pradesh GK carries real weight in every stage, so state-specific practice makes a big difference.",
                    'facts' => [
                        ['label' => 'Conducted by', 'value' => 'Himachal Pradesh Public Service Commission (HPPSC)'],
                        ['label' => 'Stages', 'value' => 'Prelims, Mains and Personality Test'],
                        ['label' => 'Prelims mode', 'value' => 'Offline, objective (OMR)'],
                        ['label' => 'Negative marking', 'value' => 'One third of the marks for the question'],
                    ],
                    'highlights' => ['Latest HPPSC pattern', 'Detailed solutions for every question', 'Himachal GK focus'],
                    'faqs' => [
                        ['question' => 'How long do I get access?', 'answer' => 'You get full access to everything in this exam for 12 months from the day you buy it.'],
                        ['question' => 'Will new tests be added?', 'answer' => 'Yes. New tests and material added to this exam during your access period are included at no extra cost.'],
                    ],
                    'is_free' => false, 'price' => 499, 'original_price' => 999, 'validity_months' => 12,
                ],
                'subjects' => ['Himachal Pradesh GK', 'Indian Polity', 'General Science'],
                'tests' => [
                    ['HPAS Prelims Practice Set 1', 40, 0.33, null, ['is_free' => false, 'price' => 99]],
                    ['HPAS Himachal GK Quick Test', 20, 0.33, 'Himachal Pradesh GK'],
                    // Sample only: shows the previous year paper layout. Replace with real papers via the admin panel.
                    ['HPAS Prelims 2023 (sample paper - replace with the real paper)', 30, 0.33, 'Himachal Pradesh GK', ['type' => 'pyq', 'year' => 2023, 'is_free' => false, 'price' => 149]],
                ],
            ],
            'HP Police Constable' => [
                'description' => 'Recruitment examination for Constable posts in the Himachal Pradesh Police.',
                'page' => [
                    'overview' => "The HP Police Constable recruitment fills Constable posts in the Himachal Pradesh Police. The written test checks general knowledge, Himachal GK, reasoning and basic maths.\n\nRegular timed practice helps you build the speed and accuracy the written test needs.",
                    'facts' => [
                        ['label' => 'Posts', 'value' => 'Constable (male and female)'],
                        ['label' => 'Written test', 'value' => 'Objective, multiple choice'],
                    ],
                    'highlights' => ['Timed practice sets', 'Himachal GK and reasoning drills'],
                    'faqs' => [['question' => 'How long do I get access?', 'answer' => 'Full access for 12 months from the day you buy.']],
                    'is_free' => false, 'price' => 299, 'original_price' => 599, 'validity_months' => 12,
                ],
                'subjects' => ['Himachal Pradesh GK', 'Reasoning and Maths', 'General Knowledge'],
                'tests' => [
                    ['Constable Practice Set 1', 30, 0.25, null],
                ],
            ],
            'HP TET (JBT)' => [
                'description' => 'Himachal Pradesh Teacher Eligibility Test for Junior Basic Teacher posts.',
                'page' => [
                    'overview' => "The Himachal Pradesh Teacher Eligibility Test (HP TET) for Junior Basic Teacher (JBT) posts is conducted by the HP Board of School Education. Passing it is required to apply for JBT posts in the state.\n\nThe paper covers child development and pedagogy, languages, mathematics and environmental studies.",
                    'facts' => [
                        ['label' => 'Conducted by', 'value' => 'HP Board of School Education (HPBOSE)'],
                        ['label' => 'Mode', 'value' => 'Offline, objective'],
                        ['label' => 'Negative marking', 'value' => 'None'],
                    ],
                    'highlights' => ['Pedagogy-focused practice', 'Bilingual-friendly explanations'],
                    'faqs' => [['question' => 'How long do I get access?', 'answer' => 'Full access for 12 months from the day you buy.']],
                    'is_free' => false, 'price' => 349, 'original_price' => 699, 'validity_months' => 12,
                ],
                'subjects' => ['Child Development and Pedagogy', 'Environmental Studies', 'English', 'Mathematics'],
                'tests' => [
                    ['HP TET JBT Practice Set 1', 30, 0, null],
                ],
            ],
            'HP Patwari (HPRCA)' => [
                'description' => 'Himachal Pradesh Rajya Chayan Aayog recruitment examination for Patwari posts.',
                'page' => [
                    'overview' => "The HP Patwari recruitment is conducted by the Himachal Pradesh Rajya Chayan Aayog (HPRCA). The written test covers general knowledge, Himachal GK, mathematics and computer basics.\n\nPractise each subject on its own, then take full timed tests to get exam-ready.",
                    'facts' => [
                        ['label' => 'Conducted by', 'value' => 'Himachal Pradesh Rajya Chayan Aayog (HPRCA)'],
                        ['label' => 'Mode', 'value' => 'Objective, multiple choice'],
                    ],
                    'highlights' => ['Maths speed drills', 'Computer basics practice'],
                    'faqs' => [['question' => 'How long do I get access?', 'answer' => 'Full access for 12 months from the day you buy.']],
                    'is_free' => false, 'price' => 299, 'original_price' => 599, 'validity_months' => 12,
                ],
                'subjects' => ['Himachal Pradesh GK', 'Computer Basics', 'Mathematics'],
                'tests' => [
                    ['Patwari Practice Set 1', 30, 0.25, null],
                ],
            ],
        ];
    }
}
