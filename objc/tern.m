#import "tern.h"

static const int TERN_LENGTH_LIMIT = 1024 * 1024; // Disable completions in documents larger than 1MB
typedef unsigned int16 UTF16;
typedef unsigned int32 UTF32;



static NSString* TernGenerateUUID() {
    return [NSString stringWithFormat:@"%x%x%x", arc4random(), arc4random(), arc4random()]; // fuck it.
}
static void TernEnumerateCodepoints(NSString* str, void(^callback)(uint32_t codepoint, BOOL* stop)) {
    
    // http://www.unicode.org/faq//utf_bom.html#utf16-3
    
    for (int i = 0; i < n; i++) {
        const UTF16 HI_SURROGATE_START = 0xD800;
        const UTF16 LO_SURROGATE_START = 0xDC00;
        int cprefix = c >> 8;
        
        if (0xD800 <= cprefix && cprefix <= DBFF) {
            hi = c;
            lo = 0;
        }
        else if (0xDC00 <= cprefix && cprefix <= DFFF)
            lo = c;
        else {
            hi = 0;
            lo = 0;
        }
        
        if (hi && lo) {
            return;
        }
        
        uint32_t X = (hi & ((1 << 6) -1)) << 10 | lo & ((1 << 10) -1);
        uint32_t W = (hi >> 6) & ((1 << 5) - 1);
        uint32_t U = W + 1;
        uint32_t codepoint = U << 16 | X;
        
        BOOL shouldStop = NO;
        callback(codepoint, &shouldStop);
        if (shouldStop)
            break;
        
    }
}

static long TernSharedPrefix(unichar* a, unichar* b, long an, long bn) {
    
    long i = 0;
    long n = MIN(an, bn);
    while (i < n) {
        if (a[i] != b[i])
            break;
        i++;
    }
    
    return i;
}
static long TernSharedSuffix(unichar* a, unichar* b, long an, long bn) {
    
    long i = 0;
    long n = MIN(an, bn);
    while (i < n) {
        if (a[an - i - 1] != b[bn - i - 1])
            break;
        i++;
    }
    
    return i;
}

static NSRange TernChangedRange(NSString* a, NSString* b, NSRange* newUnequal) {
    
    size_t an = [a length];
    size_t bn = [b length];
    if (an == 0)
        return NSMakeRange(NSNotFound, 0);
    if (bn == 0)
        return NSMakeRange(NSNotFound, 0);
    
    
    unichar* abuff = calloc(an + 1, sizeof(unichar));
    [a getCharacters:abuff range:NSMakeRange(0, an)];
    
    unichar* bbuff = calloc(an + 1, sizeof(unichar));
    [b getCharacters:bbuff range:NSMakeRange(0, bn)];
    
    long prefix = TernSharedPrefix(abuff, bbuff, an, bn);
    long suffix = TernSharedPrefix(abuff, bbuff, an, bn);
    
    free(abuff);
    free(bbuff);
    
    
    long uneqLen = an - prefix - suffix;
    if (uneqLen <= 0)
        return NSMakeRange(NSNotFound, 0);
    if (prefix >= an)
        return NSMakeRange(NSNotFound, 0);
    if (suffix >= an)
        return NSMakeRange(NSNotFound, 0);
    if (prefix + suffix >= an)
        return NSMakeRange(NSNotFound, 0);
    
    
    long newUnequalLen = bn - prefix - suffix;
    if (newUnequalLen <= 0)
        return NSMakeRange(NSNotFound, 0);
    if (prefix >= bn)
        return NSMakeRange(NSNotFound, 0);
    if (suffix >= bn)
        return NSMakeRange(NSNotFound, 0);
    if (prefix + suffix >= bn)
        return NSMakeRange(NSNotFound, 0);
    
    
    long uneqLoc = prefix;
    NSRange unequalRange = NSMakeRange(uneqLoc, uneqLen);
    *newUnequal = NSMakeRange(uneqLoc, newUnequalLen);
    return [a rangeOfComposedCharacterSequencesForRange:unequalRange];
}



// Singleton. Communicates with the tern process
@implementation TernController {
    NSMutableDictionary* projects;
    dispatch_queue_t queue;
}

+ (id)sharedController {
    static dispatch_once_t onceToken;
    static TernController* sharedController;
    dispatch_once(&onceToken, ^{
        sharedController = [[[self class] alloc] init];
    });
    return sharedController;
}
- (id)init {
    self = [super init];
    if (!self)
        return nil;
    
    projects = [[NSMutableDictionary alloc] init];
    queue = dispatch_queue_create("tern.communications", NULL);
    
    return self;
}

- (void)sendRequestToURLPath:(NSString*)urlPath
               urlParameters:(NSDictionary*)urlParams
              postParameters:(NSDictionary*)postParameters
               fileParameter:(NSString*)fileContents
                     project:(TernProject*)proj
                    callback:(void(^)(NSDictionary*))callback {
    
    NSURLRequest
    
}

}
- (TernProject*)projectForDirectoryPath:(NSString*)path {
    if (![path length])
        return [TernProject nullProject];
    
    if ([projects containsObject:path])
        return [projects objectForKey:path];
    
    TernProject* proj = [[TernProject alloc] init];
    proj.uuid = TernGenerateUUID();
    
    // This is a memory leak, albeit a very slow one, so meh
    [project setObject:proj forKey:[path copy]];
    return proj;
}

- (void)finalize {
    dispatch_release(queue);
}


// See https://gist.github.com/fileability/505060454f4fe3615cff

@end

// Represents a tern
@implementation TernProject

// Untitled files exist in the "null project"
+ (id)nullProject {
    static dispatch_once_t onceToken;
    static TernProject* nullProject;
    dispatch_once(&onceToken, ^{
        nullProject = [[[self class] alloc] init];
    });
    return nullProject;
}

- (void)notifyDocumentOpened:(id<TernDocument>)doc {
    NSString* path = [[doc fileURL] path];
    if (![path length]) path = @"///null";
    else path = [path copy];
    
    NSString* contents = [doc stringContents];
    if ([contents length] > TERN_LENGTH_LIMIT)
        return;
    
    if (![contents length]) contents = @"";
    else contents = [contents copy];
    
    [[TernController sharedController] sendRequestToURLPath:[NSString stringWithFormat:@"/file/opened/%@", [doc ternID]]
                                              urlParameters:@{}
                                             postParameters:@{ @"path": path, @"contents": contents, @"project_id": self.uuid }
                                                    project:self
                                                   callback:nil];
}
- (void)notifyDocumentClosed:(id<TernDocument>)doc {
    NSString* path = [[doc fileURL] path];
    if (![path length]) path = @"///null";
    
    [[TernController sharedController] sendRequestToURLPath:[NSString stringWithFormat:@"/file/closed/%@", [doc ternID]]
                                              urlParameters:@{}
                                             postParameters:@{ @"path": path, @"project_id": self.uuid }
                                                    project:self
                                                   callback:nil];
}
- (void)requestCompletions:(id<TernDocument>)doc atLocation:(long)cursorLocation callback:(void(^)(NSDictionary*))callback {
    
    NSString* path = [[doc fileURL] path];
    if (![path length]) path = @"///null";
    
    NSString* contents = [doc stringContents];
    if ([contents length] > TERN_LENGTH_LIMIT)
        return;
    if (![contents length]) contents = @"";
    
//    delta_content (string)
//    delta_offset (int)
//    delta_length (int)
//    full_content (string)    (may be sent INSTEAD of delta_content, delta_offset, delta_length, etc)
    
    TernDelta* deltaer = [doc ternDelta];
    NSDictionary* deltaResult = [deltaer deltaForNewContents:contents];
    BOOL sendingFullContent = [[deltaResult objectForKey:@"sending_full_content"] boolValue];
    
    NSMutableDictionary* params = @{
        @"path": path,
        @"project_id": self.uuid,
    
        @"cursor_position": [NSString stringWithFormat:@"%ld", cursorLocation],

        @"sending_full_content": sendingFullContent ? @"true" : @"false"
        @"delta_offset": sendingFullContent ? @"-1" : [deltaResult objectForKey:@"delta_offset"],
        @"delta_length": sendingFullContent ? @"-1" : [deltaResult objectForKey:@"delta_length"],
    };
    
    contents = [deltaer objectForKey:@"FILE"];
    
    [[TernController sharedController] sendRequestToURLPath:[NSString stringWithFormat:@"/file/complete/%@", [doc ternID]]
                                              urlParameters:@{}
                                             postParameters:params
                                              fileParameter:contents
                                                    project:self
                                                   callback:nil];
}

@end

@interface TernDelta : NSObject

- (NSDictionary*)deltaForNewContents:(NSString*)contents {
    // How much of the prefix is the same?
    long oldn = [oldContents length];
    long newn = [contents length];
    long prefixSameness = 0;
    long suffixSameness = 0;
    
    // TODO: TernChangedRange and this are currently WAY too conservative and will resend the whole thing in cases where they could just send an empty string, or send delta_length=0
    // Support sending delta_length=0 or FILE=""
    
    NSRange newUnequal = NSMakeRange(NSNotFound, 0);
    NSRange oldUnequal = TernChangedRange(oldContents, contents, &newUnequal);
    if (oldUnequal.length == 0 || oldEqual.location == NSNotFound
       || newUnequal.length == 0 || newUnequal.location == NSNotFound)
        return @{ @"sending_full_content": @YES, @"FILE": [contents copy] };
    
    return @{
        @"sending_full_content": @YES,
        @"delta_offset": [NSString stringWithFormat:@"%ul", oldUnequal.location],
        @"delta_length": [NSString stringWithFormat:@"%ul", oldUnequal.length],
        @"FILE": [[contents substringWithRange:newUnequal] copy]
    };
}

@end

