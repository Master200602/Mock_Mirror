# MockMirror Fine-Tuning Notebook (100% Free on Google Colab)
# Train your own LLM model weights on a free T4 GPU

!pip install -q unsloth transformers datasets trl peft

from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import Dataset
import json

# 1. Load Base Model (Microsoft Phi-3.5 Mini - 3.8B parameters)
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "microsoft/Phi-3.5-mini-instruct",
    max_seq_length = 2048,
    dtype = None,
    load_in_4bit = True,
)

# 2. Add LoRA Adapters for Fine-Tuning
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = True,
)

# 3. Create Sample Interview Training Dataset
sample_dataset = [
  {
    "instruction": "Evaluate candidate technical interview response.",
    "input": "Domain: Web Development | Question: Explain closures in JavaScript. | Candidate Answer: A closure is a function that remembers its outer variables even after the outer function has executed.",
    "output": json.dumps({
      "rawScore": 9,
      "feedback": "Accurate and concise explanation of JavaScript closures and scope preservation.",
      "strengths": ["Clear conceptual grasp", "Precise terminology"],
      "improvements": ["Could mention practical use cases like data privacy"]
    })
  }
]

def format_prompt(example):
    return {
        "text": f"<|system|>You are MockMirror AI, a strict senior interviewer evaluating technical answers.<|end|>\n<|user|>{example['input']}<|end|>\n<|assistant|>{example['output']}<|end|>"
    }

dataset = Dataset.from_list([format_prompt(item) for item in sample_dataset])

# 4. Configure & Run Trainer
trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = 2048,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        num_train_epochs = 1,
        learning_rate = 2e-4,
        output_dir = "mockmirror-phi3-trained",
    ),
)

print("Starting Fine-Tuning on Google Colab...")
trainer.train()

# 5. Export Model to GGUF format for Ollama
model.save_pretrained_gguf("mockmirror-gguf", tokenizer, quantization_method="q4_k_m")
print("✅ Training Complete! Download the mockmirror-gguf folder to use locally.")
