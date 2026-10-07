"""Optional authoring utility: Pillow, edge-tts and FFmpeg; not needed to run the app."""
import asyncio, json, math, os, subprocess, tempfile
from pathlib import Path
import edge_tts
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'frontend/public/media';OUT.mkdir(parents=True,exist_ok=True)
FONTS=Path(os.getenv('LECTURE_FONT_DIR','/usr/share/fonts/truetype/dejavu'))
DATA=[
('Learning from examples','A pattern, not a promise',
'Welcome to CogniStream. In this short lesson, we will build an easy mental picture of a neural network. A neural network learns a relationship between inputs and outputs from examples. Imagine that our input is the number of hours a student studied, and our output is a test score. We show the network many examples so it can learn a pattern. Later, it uses that pattern to estimate a score for a new input. Remember, a prediction is an estimate, not a guarantee.',
['Learn a relationship from examples','Use inputs to estimate an output','A prediction can still be wrong'],
'A neural network learns a pattern from examples. It uses that pattern to estimate an output for a new input. Study hours are the input and a predicted score is the output.',
'Think of noticing a pattern in practice results. Past examples help you make an estimate, but the next result can still be different.',
'In this example, what is the input?',['Hours studied','The predicted score','The training loss'],0),
('Inside the network','Input → hidden layers → output',
'A network has three main parts: an input layer, one or more hidden layers, and an output layer. The input layer receives the values we provide. Hidden layers transform these values step by step. The output layer returns the prediction. In the study-hours example, the input could be four hours, and the output could be an estimated score. The connections between layers contain adjustable numbers. During training, those numbers are changed so the network can produce more useful predictions.',
['Inputs contain the values we supply','Hidden layers transform those values','The output is the network’s prediction'],
'The input layer receives values. Hidden layers transform them, and the output layer returns a prediction. Training adjusts the numbers on the connections.',
'A small assembly line passes a result from one stage to the next. Each stage transforms what it receives.',
'Which part returns the prediction?',['The input layer','The output layer','The subtitle file'],1),
('Weights and activation','How a neuron combines information',
'Let us look at one neuron. A weight controls how strongly an input influences it. For a simple neuron with one input, we first multiply the input by its weight, then add a bias. Suppose the input is three, the weight is two, and the bias is one. The combined value is two times three plus one, which equals seven. The neuron then applies an activation function. For example, the ReLU activation keeps positive values and changes negative values to zero. So ReLU applied to seven is still seven.',
['A weight changes an input’s influence','Bias adds an adjustable offset','Activation transforms the combination'],
'A neuron combines weighted inputs and a bias, then applies an activation function. For input 3, weight 2, and bias 1, the combined value is 7. ReLU keeps that positive value.',
'A weight acts like a volume control for an input, changing how strongly that input contributes.',
'What is 2 × 3 + 1, before activation?',['5','6','7'],2),
('Measuring the error','Loss tells us how far we missed',
'How does the network know whether its prediction was useful? We use a loss function. Loss measures the difference between the prediction and the expected answer. One example is squared error. If the network predicts a score of seventy, but the true score is eighty, the difference is minus ten. Squaring minus ten gives one hundred. That is the squared error for this example. When the prediction exactly matches the target, this loss is zero. During training, we aim to reduce the loss across many examples.',
['Compare the prediction with the target','Squared error is one possible loss','Training aims to reduce the loss'],
'Loss measures prediction error. For prediction 70 and target 80, squared error is (70 − 80)² = 100. If they match, squared error is zero.',
'Loss is like measuring how far a dart landed from the target. A smaller miss is better for that example.',
'What is squared error when prediction equals target?',['Zero','Always one hundred','The number of layers'],0),
('Learning from feedback','Backpropagation and gradient descent',
'Once we have calculated the loss, we need to improve the network. Backpropagation calculates gradients, which tell us how changes in each weight affect the loss. Gradient descent then uses those gradients to update the weights in a direction intended to reduce the loss. The learning rate controls the size of each update. A very large update can overshoot, while a very small update may learn slowly. Training repeats this loop: make a prediction, calculate the loss, calculate gradients, and update the weights.',
['Backpropagation calculates gradients','Gradient descent updates the weights','Learning rate controls update size'],
'Backpropagation calculates how weights affect the loss. Gradient descent uses that information to update weights. The learning rate controls update size.',
'Like adjusting a recipe after tasting it, training uses feedback to decide which settings to change and how much.',
'What controls the size of a weight update?',['The video speed','The learning rate','The camera resolution'],1),
('Testing what we learned','New examples reveal generalisation',
'Finally, we need to check whether the network learned a useful pattern. Training examples are used to adjust the weights. Evaluation examples are kept separate from those updates. If a network only memorises the training examples, it may perform poorly on new examples. Evaluation helps us check generalisation: how well the learned pattern works beyond the data used for training. To recap, a network transforms inputs into predictions, measures error with a loss function, and learns through repeated weight updates. Thank you for learning with CogniStream.',
['Training adjusts the network’s weights','Evaluation uses separate examples','Check performance beyond memorisation'],
'Training changes weights using training examples. Evaluation uses separate examples that were not used for those updates. This checks generalisation beyond memorised data.',
'Working through solved questions is like training. Answering new questions without solutions is like evaluation.',
'Why keep evaluation examples separate?',['To make the video longer','To remove every possible error','To check performance on new examples'],2)
]
def f(s,b=False):
 candidates=[FONTS/('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf'),Path(os.getenv('WINDIR','C:/Windows'))/'Fonts'/('segoeuib.ttf' if b else 'segoeui.ttf')]
 for path in candidates:
  if path.exists():return ImageFont.truetype(str(path),s)
 raise RuntimeError('Set LECTURE_FONT_DIR to a folder containing DejaVuSans.ttf and DejaVuSans-Bold.ttf.')
def txt(d,p,t,s=20,c='#244236',b=False):d.text(p,t,font=f(s,b),fill=c)
def arrow(d,a,b):
 d.line([a,b],fill='#719981',width=3);ang=math.atan2(b[1]-a[1],b[0]-a[0]);d.polygon([b,(b[0]-10*math.cos(ang-.5),b[1]-10*math.sin(ang-.5)),(b[0]-10*math.cos(ang+.5),b[1]-10*math.sin(ang+.5))],fill='#719981')
def card(i,ch):
 im=Image.new('RGB',(1280,720),'#f4f6ef');d=ImageDraw.Draw(im);d.rounded_rectangle((840,-120,1420,640),180,fill='#e4eee3')
 d.rounded_rectangle((48,44,91,87),12,fill='#204638');txt(d,(59,50),'C',26,'#d1ebc4',True);txt(d,(106,48),'CogniStream',23,b=True);txt(d,(106,80),'LEARN AT YOUR PACE',10,'#6a8375',True)
 txt(d,(48,132),f'NEURAL NETWORKS / CHAPTER {i+1:02}',13,'#65866d',True);txt(d,(48,170),ch[0],42,b=True);txt(d,(50,231),ch[1],21,'#6d8275')
 for j,line in enumerate(ch[3]):
  y=310+j*50;d.ellipse((52,y+8,62,y+18),fill='#7fa47b');txt(d,(78,y),line,19)
 d.rounded_rectangle((670,280,1216,585),20,fill='#fffef9',outline='#d6dfd0',width=2)
 if i<2:
  for x,n in [(733,2),(919,3),(1128,1)]:
   for j in range(n):
    y=425+(j-(n-1)/2)*72;d.ellipse((x-21,y-21,x+21,y+21),fill='#cce2be',outline='#85a178',width=2)
  for y in [389,461]:
   for z in [353,425,497]:d.line((754,y,898,z),fill='#b8cbb0',width=2)
  for y in [353,425,497]:d.line((940,y,1107,425),fill='#b8cbb0',width=2)
  txt(d,(709,304),'INPUT TO PREDICTION',13,'#68856b',True);txt(d,(711,542),'Inputs',14);txt(d,(865,542),'Hidden layer',14);txt(d,(1090,542),'Output',14)
 elif i==2:
  txt(d,(709,307),'WEIGHT × INPUT + BIAS',16,'#68856b',True);txt(d,(712,366),'2 × 3 + 1 = 7',42,b=True);d.rounded_rectangle((709,457,1176,553),12,fill='#edf3e5');txt(d,(730,475),'ReLU(7) = 7',28,b=True);txt(d,(730,523),'Positive values are kept.',14)
 elif i==3:
  txt(d,(709,307),'PREDICTION vs TARGET',15,'#68856b',True);txt(d,(731,356),'70',50,b=True);txt(d,(1022,356),'80',50,b=True);arrow(d,(839,391),(990,391));txt(d,(730,421),'Predicted',14);txt(d,(1022,421),'Expected',14);d.rounded_rectangle((709,475,1176,552),12,fill='#edf3e5');txt(d,(734,495),'(70 − 80)² = 100',28,b=True)
 elif i==4:
  txt(d,(709,307),'FOLLOW FEEDBACK DOWNHILL',13,'#68856b',True);points=[(x,527-150*((x-945)/210)**2) for x in range(738,1154,3)];d.line(points,fill='#8fac7f',width=4)
  a=(1113,527-150*.8**2);b=(1050,527-150*.5**2);arrow(d,a,b)
  for x,y in [a,b]:d.ellipse((x-7,y-7,x+7,y+7),fill='#234d38')
  txt(d,(750,547),'Illustration: moving toward smaller loss',14)
 else:
  txt(d,(709,307),'TRAIN',16,'#68856b',True);txt(d,(993,307),'EVALUATE',16,'#68856b',True)
  for group,x0 in [(0,710),(1,991)]:
   for row in range(3):
    for col in range(3):
     x=x0+col*55;y=350+row*55;d.rounded_rectangle((x,y,x+40,y+40),8,fill='#c4dbb3' if group==0 else '#e3ce9f')
  txt(d,(709,542),'Used for updates',14);txt(d,(990,542),'Separate examples',14)
 d.line((48,637,1232,637),fill='#d2decd',width=2);txt(d,(48,660),'INTRODUCTION TO NEURAL NETWORKS',12,'#789071',True);txt(d,(1101,656),f'{i+1:02} / 06',17,'#68846a',True)
 return im

def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(p)]))
def stamp(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02}.{n%1000:03}'
async def main():
 roots=Path('/etc/ssl/certs/ca-certificates.crt')
 if roots.exists():
  import edge_tts.communicate as service
  service._SSL_CTX.load_verify_locations(str(roots))
 with tempfile.TemporaryDirectory() as folder:
  tmp=Path(folder);offset=0;chapters=[];cues=[];segments=[]
  for i,ch in enumerate(DATA):
   print('Narrating:',ch[0],flush=True);audio=tmp/f'{i}.mp3';local=[]
   with audio.open('wb') as out:
    async for item in edge_tts.Communicate(ch[2],'en-US-AriaNeural',rate='-6%',boundary='SentenceBoundary').stream():
     if item['type']=='audio':out.write(item['data'])
     elif item['type']=='SentenceBoundary':local.append({'start':item['offset']/1e7,'end':(item['offset']+item['duration'])/1e7,'text':item['text']})
   if not local:raise RuntimeError('Narration returned no caption timestamps')
   image=tmp/f'{i}.png';card(i,ch).save(image)
   if i==0:card(i,ch).save(OUT/'poster.jpg',quality=92)
   segment=tmp/f'{i}.mp4';length=duration(audio)+1.3
   subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate','12','-i',str(image),'-i',str(audio),'-filter_complex','[1:a]apad=pad_dur=1.3[a]','-map','0:v','-map','[a]','-t',str(length),'-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','24000','-movflags','+faststart',str(segment)],check=True)
   actual=duration(segment);segments.append(segment)
   chapters.append({'title':ch[0],'subtitle':ch[1],'start':round(offset,3),'end':round(offset+actual,3),'explanation':ch[4],'analogy':ch[5],'check_question':ch[6],'check_options':ch[7],'check_answer':ch[8]})
   for cue in local:cues.append({'start':offset+cue['start'],'end':min(offset+actual,offset+cue['end']),'text':cue['text']})
   offset+=actual
  listing=tmp/'concat.txt';listing.write_text(''.join(f"file '{p}'\n" for p in segments))
  subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(OUT/'demo.mp4')],check=True)
  for index,cue in enumerate(cues[:-1]):cue['end']=min(cue['end'],cues[index+1]['start']-.001)
  (OUT/'demo.vtt').write_text('WEBVTT\n\n'+''.join(f"{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}\n\n" for c in cues),encoding='utf-8')
  (OUT/'demo.srt').write_text(''.join(f"{i+1}\n{stamp(c['start']).replace('.',',')} --> {stamp(c['end']).replace('.',',')}\n{c['text']}\n\n" for i,c in enumerate(cues)),encoding='utf-8')
  (OUT/'lecture-transcript.txt').write_text('\n\n'.join(ch[0]+'\n'+ch[2] for ch in DATA),encoding='utf-8')
  result={'id':'demo','version':2,'title':'Neural networks, made simple','description':'A narrated introduction to inputs, layers, weights, loss, and learning.','narration':'Synthetic English narration','duration':round(duration(OUT/'demo.mp4'),3),'chapters':chapters,'cue_count':len(cues)}
  (OUT/'lesson.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8');print(f"Finished: {result['duration']:.1f} seconds, {len(cues)} sentence captions",flush=True)
if __name__=='__main__':asyncio.run(main())
