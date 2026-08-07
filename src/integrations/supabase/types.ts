export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string
          id: string
          kind: string
          name: string
          threshold: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          kind?: string
          name: string
          threshold?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          kind?: string
          name?: string
          threshold?: number | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          client_id: string
          created_at: string
          duration_min: number
          id: string
          notes: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          title: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          arm_cm: number | null
          bmi: number | null
          body_fat_pct: number | null
          calf_cm: number | null
          chest_cm: number | null
          client_id: string
          created_at: string
          custom_fields: Json
          date: string
          fat_mass: number | null
          height_cm: number | null
          hip_cm: number | null
          id: string
          muscle_mass: number | null
          notes: string | null
          thigh_cm: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          client_id: string
          created_at?: string
          custom_fields?: Json
          date?: string
          fat_mass?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          client_id?: string
          created_at?: string
          custom_fields?: Json
          date?: string
          fat_mass?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          client_id: string
          comments: string | null
          created_at: string
          energy: number | null
          hunger: number | null
          id: string
          motivation: number | null
          nutrition_compliance: number | null
          pain: string | null
          reviewed_at: string | null
          sleep: number | null
          status: Database["public"]["Enums"]["checkin_status"]
          stress: number | null
          submitted_at: string | null
          trainer_feedback: string | null
          week_start: string
          weight_kg: number | null
          workouts_done: number | null
        }
        Insert: {
          client_id: string
          comments?: string | null
          created_at?: string
          energy?: number | null
          hunger?: number | null
          id?: string
          motivation?: number | null
          nutrition_compliance?: number | null
          pain?: string | null
          reviewed_at?: string | null
          sleep?: number | null
          status?: Database["public"]["Enums"]["checkin_status"]
          stress?: number | null
          submitted_at?: string | null
          trainer_feedback?: string | null
          week_start?: string
          weight_kg?: number | null
          workouts_done?: number | null
        }
        Update: {
          client_id?: string
          comments?: string | null
          created_at?: string
          energy?: number | null
          hunger?: number | null
          id?: string
          motivation?: number | null
          nutrition_compliance?: number | null
          pain?: string | null
          reviewed_at?: string | null
          sleep?: number | null
          status?: Database["public"]["Enums"]["checkin_status"]
          stress?: number | null
          submitted_at?: string | null
          trainer_feedback?: string | null
          week_start?: string
          weight_kg?: number | null
          workouts_done?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_achievements: {
        Row: {
          achievement_id: string
          client_id: string
          earned_at: string
          id: string
        }
        Insert: {
          achievement_id: string
          client_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          achievement_id?: string
          client_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_achievements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived: boolean
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string
          goal: string | null
          gym_id: string | null
          height_cm: number | null
          id: string
          last_activity_at: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          sex: string | null
          start_date: string
          status: Database["public"]["Enums"]["client_status"]
          trainer_id: string
          updated_at: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          archived?: boolean
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          goal?: string | null
          gym_id?: string | null
          height_cm?: number | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          sex?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["client_status"]
          trainer_id: string
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          archived?: boolean
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          goal?: string | null
          gym_id?: string | null
          height_cm?: number | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          sex?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["client_status"]
          trainer_id?: string
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          common_mistakes: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string | null
          id: string
          image_url: string | null
          instructions: string | null
          muscle_group: string | null
          name: string
          trainer_id: string | null
          updated_at: string
          variations: string | null
          video_url: string | null
        }
        Insert: {
          common_mistakes?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          muscle_group?: string | null
          name: string
          trainer_id?: string | null
          updated_at?: string
          variations?: string | null
          video_url?: string | null
        }
        Update: {
          common_mistakes?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          muscle_group?: string | null
          name?: string
          trainer_id?: string | null
          updated_at?: string
          variations?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      foods: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          id: string
          name: string
          portion: string
          protein: number
          substitutions: string[]
          trainer_id: string | null
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          name: string
          portion?: string
          protein?: number
          substitutions?: string[]
          trainer_id?: string | null
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          name?: string
          portion?: string
          protein?: number
          substitutions?: string[]
          trainer_id?: string | null
        }
        Relationships: []
      }
      gyms: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          client_id: string
          completed: boolean
          created_at: string
          date: string
          habit_id: string
          id: string
          value: number | null
        }
        Insert: {
          client_id: string
          completed?: boolean
          created_at?: string
          date?: string
          habit_id: string
          id?: string
          value?: number | null
        }
        Update: {
          client_id?: string
          completed?: boolean
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          icon: string
          id: string
          name: string
          target: number | null
          unit: string | null
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          target?: number | null
          unit?: string | null
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          target?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number | null
          carbs: number | null
          client_id: string
          created_at: string
          fat: number | null
          id: string
          items: Json
          meal_type: string
          name: string | null
          notes: string | null
          plan_id: string
          protein: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          client_id: string
          created_at?: string
          fat?: number | null
          id?: string
          items?: Json
          meal_type?: string
          name?: string | null
          notes?: string | null
          plan_id: string
          protein?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          client_id?: string
          created_at?: string
          fat?: number | null
          id?: string
          items?: Json
          meal_type?: string
          name?: string | null
          notes?: string | null
          plan_id?: string
          protein?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          client_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          client_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          client_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_plans: {
        Row: {
          active: boolean
          calories: number | null
          carbs: number | null
          client_id: string
          created_at: string
          fat: number | null
          id: string
          name: string
          notes: string | null
          protein: number | null
          updated_at: string
          water_ml: number | null
        }
        Insert: {
          active?: boolean
          calories?: number | null
          carbs?: number | null
          client_id: string
          created_at?: string
          fat?: number | null
          id?: string
          name?: string
          notes?: string | null
          protein?: number | null
          updated_at?: string
          water_ml?: number | null
        }
        Update: {
          active?: boolean
          calories?: number | null
          carbs?: number | null
          client_id?: string
          created_at?: string
          fat?: number | null
          id?: string
          name?: string
          notes?: string | null
          protein?: number | null
          updated_at?: string
          water_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: string
          id: string
          method: string | null
          next_payment_date: string | null
          paid_at: string | null
          plan_name: string
          start_date: string
          status: Database["public"]["Enums"]["payment_status"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          next_payment_date?: string | null
          paid_at?: string | null
          plan_name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["payment_status"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          next_payment_date?: string | null
          paid_at?: string | null
          plan_name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["payment_status"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_on: string
          client_id: string
          created_at: string
          exercise_id: string | null
          id: string
          record_type: string
          reps: number | null
          value: number
          weight: number | null
        }
        Insert: {
          achieved_on?: string
          client_id: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          record_type?: string
          reps?: number | null
          value: number
          weight?: number | null
        }
        Update: {
          achieved_on?: string
          client_id?: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          record_type?: string
          reps?: number | null
          value?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          brand_color: string | null
          brand_logo_url: string | null
          brand_name: string | null
          created_at: string
          email: string | null
          full_name: string
          gym_id: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gym_id?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gym_id?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_fk"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          category: Database["public"]["Enums"]["photo_category"]
          client_id: string
          created_at: string
          id: string
          notes: string | null
          taken_on: string
          url: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["photo_category"]
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          taken_on?: string
          url: string
        }
        Update: {
          category?: Database["public"]["Enums"]["photo_category"]
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          taken_on?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          client_id: string
          created_at: string
          data: Json
          id: string
          period_end: string
          period_start: string
          trainer_comment: string | null
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: Json
          id?: string
          period_end: string
          period_start: string
          trainer_comment?: string | null
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: Json
          id?: string
          period_end?: string
          period_start?: string
          trainer_comment?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          annual_price: number | null
          created_at: string
          description: string | null
          features: Json
          has_ai: boolean
          has_nutrition: boolean
          has_reports: boolean
          has_white_label: boolean
          id: string
          max_clients: number | null
          max_trainers: number
          monthly_price: number | null
          name: string
          slug: string
          sort_order: number
          storage_gb: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_price?: number | null
          created_at?: string
          description?: string | null
          features?: Json
          has_ai?: boolean
          has_nutrition?: boolean
          has_reports?: boolean
          has_white_label?: boolean
          id?: string
          max_clients?: number | null
          max_trainers?: number
          monthly_price?: number | null
          name: string
          slug: string
          sort_order?: number
          storage_gb?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_price?: number | null
          created_at?: string
          description?: string | null
          features?: Json
          has_ai?: boolean
          has_nutrition?: boolean
          has_reports?: boolean
          has_white_label?: boolean
          id?: string
          max_clients?: number | null
          max_trainers?: number
          monthly_price?: number | null
          name?: string
          slug?: string
          sort_order?: number
          storage_gb?: number
          updated_at?: string
        }
        Relationships: []
      }
      trainer_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          id: string
          next_billing_at: string | null
          plan_id: string | null
          price: number | null
          started_at: string
          status: Database["public"]["Enums"]["payment_status"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          id?: string
          next_billing_at?: string | null
          plan_id?: string | null
          price?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          id?: string
          next_billing_at?: string | null
          plan_id?: string | null
          price?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_days: {
        Row: {
          created_at: string
          day_index: number
          id: string
          name: string
          notes: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          day_index?: number
          id?: string
          name: string
          notes?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          id?: string
          name?: string
          notes?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          block: string | null
          created_at: string
          day_id: string
          distance_m: number | null
          exercise_id: string | null
          id: string
          notes: string | null
          position: number
          reps: string | null
          rest_seconds: number | null
          rir: number | null
          rpe: number | null
          sets: number | null
          tempo: string | null
          time_seconds: number | null
          weight: number | null
        }
        Insert: {
          block?: string | null
          created_at?: string
          day_id: string
          distance_m?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          rir?: number | null
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          time_seconds?: number | null
          weight?: number | null
        }
        Update: {
          block?: string | null
          created_at?: string
          day_id?: string
          distance_m?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          rir?: number | null
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          time_seconds?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_log_sets: {
        Row: {
          client_id: string
          completed: boolean
          created_at: string
          exercise_id: string | null
          id: string
          log_id: string
          notes: string | null
          reps: number | null
          rir: number | null
          rpe: number | null
          set_number: number
          weight: number | null
        }
        Insert: {
          client_id: string
          completed?: boolean
          created_at?: string
          exercise_id?: string | null
          id?: string
          log_id: string
          notes?: string | null
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_number?: number
          weight?: number | null
        }
        Update: {
          client_id?: string
          completed?: boolean
          created_at?: string
          exercise_id?: string | null
          id?: string
          log_id?: string
          notes?: string | null
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_number?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_log_sets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_log_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_log_sets_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          client_id: string
          created_at: string
          day_id: string | null
          duration_min: number | null
          feeling: number | null
          id: string
          notes: string | null
          pain: string | null
          performed_at: string
          status: string
          template_id: string | null
          total_volume: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          day_id?: string | null
          duration_min?: number | null
          feeling?: number | null
          id?: string
          notes?: string | null
          pain?: string | null
          performed_at?: string
          status?: string
          template_id?: string | null
          total_volume?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          day_id?: string | null
          duration_min?: number | null
          feeling?: number | null
          id?: string
          notes?: string | null
          pain?: string | null
          performed_at?: string
          status?: string
          template_id?: string | null
          total_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          is_template: boolean
          name: string
          trainer_id: string
          updated_at: string
          weeks: number
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          name: string
          trainer_id: string
          updated_at?: string
          weeks?: number
        }
        Update: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          name?: string
          trainer_id?: string
          updated_at?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_client: { Args: { _client_id: string }; Returns: boolean }
      can_manage_template: { Args: { _template_id: string }; Returns: boolean }
      can_view_client: { Args: { _client_id: string }; Returns: boolean }
      can_view_template: { Args: { _template_id: string }; Returns: boolean }
      current_gym_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gym_admin_of: { Args: { _gym_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_trainer_of_user: { Args: { _profile_id: string }; Returns: boolean }
      template_of_day: { Args: { _day_id: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "gym_admin" | "trainer" | "client"
      appointment_status:
        | "programada"
        | "confirmada"
        | "cancelada"
        | "completada"
      checkin_status: "pendiente" | "completado" | "revisado"
      client_status: "activo" | "inactivo" | "pausado" | "finalizado"
      payment_status: "activo" | "pendiente" | "vencido" | "cancelado"
      photo_category:
        | "frente"
        | "espalda"
        | "perfil_izquierdo"
        | "perfil_derecho"
        | "personalizada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "gym_admin", "trainer", "client"],
      appointment_status: [
        "programada",
        "confirmada",
        "cancelada",
        "completada",
      ],
      checkin_status: ["pendiente", "completado", "revisado"],
      client_status: ["activo", "inactivo", "pausado", "finalizado"],
      payment_status: ["activo", "pendiente", "vencido", "cancelado"],
      photo_category: [
        "frente",
        "espalda",
        "perfil_izquierdo",
        "perfil_derecho",
        "personalizada",
      ],
    },
  },
} as const
